import { createHmac, randomInt } from 'node:crypto';
import { isIP } from 'node:net';
import { createClient } from '@supabase/supabase-js';

// Only these functions may be invoked with the server credential. Every one
// except create_group is checked against the relevant shared key first.
const rpcKeyType: Record<string, 'access' | 'admin' | 'secret' | 'create'> = {
  create_group: 'create',
  get_group_by_access_key: 'access',
  get_group_by_admin_key: 'admin',
  get_group_shift_schedule: 'secret',
  update_group_shift_schedule: 'admin',
  get_staff_list: 'secret',
  get_staff: 'secret',
  get_staff_shifts: 'secret',
  get_shift: 'secret',
  upsert_shift: 'secret',
  delete_shift: 'secret',
  get_shift_confirmation: 'secret',
  set_shift_confirmation: 'secret',
  add_staff: 'admin',
  update_staff_name: 'admin',
  delete_staff: 'admin',
  cleanup_old_shifts: 'admin',
};

const failure = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers: { 'Cache-Control': 'no-store' } });

function newGroupKey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

export async function POST(request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!Object.hasOwn(rpcKeyType, name)) return failure(404, 'NOT_FOUND', 'Not found');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return failure(503, 'NOT_CONFIGURED', 'Service unavailable');

  // Vercel replaces this header with the actual client address. Never trust a
  // forwarded header on an arbitrary self-hosted production deployment.
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.trim()
    : process.env.NODE_ENV === 'development' ? '127.0.0.1' : null;
  if (!ip || !isIP(ip)) return failure(503, 'CLIENT_IP_UNAVAILABLE', 'Service unavailable');

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 16384) return failure(413, 'BODY_TOO_LARGE', 'Request too large');
  let args: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 16384) return failure(413, 'BODY_TOO_LARGE', 'Request too large');
    args = JSON.parse(body);
  } catch {
    return failure(400, 'BAD_REQUEST', 'Invalid request');
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return failure(400, 'BAD_REQUEST', 'Invalid request');
  }
  const params = args as Record<string, unknown>;
  const keyType = rpcKeyType[name];
  if (keyType === 'secret' && params.p_is_admin_key !== undefined && typeof params.p_is_admin_key !== 'boolean') {
    return failure(400, 'BAD_REQUEST', 'Invalid request');
  }
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  if (keyType === 'create') {
    // Never accept chosen keys: an attacker could otherwise create a group
    // with each guessed key and make every guess pass the rate check.
    params.p_access_key = newGroupKey();
    params.p_admin_key = newGroupKey();
  } else {
    const key = params[keyType === 'access' ? 'p_access_key' : keyType === 'admin' ? 'p_admin_key' : 'p_secret'];
    const isAdmin = keyType === 'admin' || (keyType === 'secret' && params.p_is_admin_key === true);
    const ipHash = createHmac('sha256', serviceKey).update(ip).digest('hex');
    const { data, error } = await db.rpc('gateway_check_secret', {
      p_ip_hash: ipHash,
      p_secret: typeof key === 'string' && key.length <= 512 ? key : '',
      p_is_admin_key: isAdmin,
    });
    if (error) return failure(503, 'RATE_CHECK_UNAVAILABLE', 'Service unavailable');
    if (data === 'locked') return failure(429, 'RATE_LIMITED', '試行回数が多すぎます。時間をおいて再試行してください');
    if (data !== 'valid') return failure(401, 'INVALID_SECRET', '無効なキーです');
  }

  const { data, error, status } = await db.rpc(name, params);
  if (error) return failure(status >= 400 && status < 500 ? status : 500, error.code || 'RPC_ERROR', error.message);
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { validate as isUUID } from 'uuid';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> } // ✅ `params` を `Promise` で取得
): Promise<NextResponse> {
  try {
    const { staffId } = await context.params; // ✅ `await` で `params` を取得

    logger.log("確定状態取得リクエスト (REST):", staffId);

    // UUIDのバリデーション
    if (!isUUID(staffId)) {
      return NextResponse.json(
        { success: false, error: '無効な staffId です' },
        { status: 400 }
      );
    }

    // Supabaseからデータ取得
    const { data, error } = await supabase
      .from('staff')
      .select('is_shift_confirmed')
      .eq('id', staffId)
      .maybeSingle();

    logger.log("🟢 スタッフ確定状態 (REST):", data);

    if (error) {
      logger.error("❌ シフト確認状態取得エラー (REST):", error);
      return NextResponse.json(
        { success: false, error: 'シフト確認状態の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { isConfirmed: data?.is_shift_confirmed ?? false }
      }
    );
  } catch (error) {
    logger.error("❌ シフト確認状態取得エラー (REST):", error);
    return NextResponse.json(
      { success: false, error: 'シフト確認状態の取得に失敗しました' },
      { status: 500 }
    );
  }
}

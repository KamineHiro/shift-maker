import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validate as isUUID } from 'uuid';

export async function GET(
  request: Request,
  { params }: { params: { staffId: string; date: string } }
) {
  try {
    // UUID バリデーションを追加
    if (!isUUID(params.staffId)) {
      return NextResponse.json({ success: false, error: '無効な staffId です' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', params.staffId)
      .eq('date', params.date)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase GET エラー:", error);
      return NextResponse.json({ success: false, error: 'シフト情報の取得に失敗しました' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'シフト情報が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("❌ GET エラー:", error);
    return NextResponse.json({ success: false, error: 'シフト情報の取得に失敗しました' }, { status: 500 });
  }
}

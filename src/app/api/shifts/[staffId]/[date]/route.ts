import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validate as isUUID } from 'uuid';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ staffId: string; date: string }> } // `params` を非同期で取得
): Promise<NextResponse> {
  try {
    const { staffId, date } = await context.params; // `await` で解決

    // UUID のバリデーション
    if (!isUUID(staffId)) {
      return NextResponse.json(
        { success: false, error: '無効な staffId です' },
        { status: 400 }
      );
    }

    // `date` のバリデーション
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return NextResponse.json(
        { success: false, error: '無効な日付形式です (YYYY-MM-DD 必須)' },
        { status: 400 }
      );
    }

    // Supabase からデータ取得
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staffId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase GET エラー:", error);
      return NextResponse.json(
        { success: false, error: 'シフト情報の取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'シフト情報が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("❌ GET エラー:", error);
    return NextResponse.json(
      { success: false, error: 'シフト情報の取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}

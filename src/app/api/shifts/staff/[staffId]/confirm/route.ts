import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validate as isUUID } from 'uuid';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> } // ✅ 修正: `params` を `Promise` で取得
): Promise<NextResponse> {
  try {
    const { staffId } = await context.params; // ✅ `await` で `params` を取得

    // UUID のバリデーション
    if (!isUUID(staffId)) {
      return NextResponse.json(
        { success: false, error: '無効な staffId です' },
        { status: 400 }
      );
    }

    // Supabase でシフト確定ステータスを更新
    const { error } = await supabase
      .from('shifts')
      .update({ isConfirmed: true })
      .eq('staff_id', staffId);

    if (error) {
      console.error("❌ Supabase 更新エラー:", error);
      return NextResponse.json(
        { success: false, error: 'シフト確定に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'シフトが確定しました' });
  } catch (error) {
    console.error("❌ POST エラー:", error);
    return NextResponse.json(
      { success: false, error: 'シフト確定中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
}
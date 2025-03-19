import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validate as isUUID } from 'uuid';

export async function GET(
  request: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    // paramsオブジェクトをawaitして非同期的に解決
    const { staffId } = await params;
    console.log("確定状態取得リクエスト (REST):", staffId);

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

    console.log("🟢 スタッフ確定状態 (REST):", data);

    if (error) {
      console.error("❌ シフト確認状態取得エラー (REST):", error);
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
    console.error("❌ シフト確認状態取得エラー (REST):", error);
    return NextResponse.json(
      { success: false, error: 'シフト確認状態の取得に失敗しました' },
      { status: 500 }
    );
  }
} 
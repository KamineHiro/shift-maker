import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validate as isUUID } from 'uuid';

export async function POST(
  request: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    // paramsオブジェクトをawaitして非同期的に解決
    const { staffId } = await params;
    console.log("確定取り消しリクエスト受信 (REST):", staffId);

    // UUIDのバリデーション
    if (!isUUID(staffId)) {
      return NextResponse.json({ success: false, error: '無効なスタッフIDです' }, { status: 400 });
    }

    // スタッフが存在するか確認
    const { data: staff, error: checkError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', staffId)
      .maybeSingle();

    console.log("🟢 スタッフデータ (REST):", staff);
    
    if (checkError) {
      console.error("❌ スタッフ確認エラー (REST):", checkError);
      return NextResponse.json({ success: false, error: 'スタッフの確認に失敗しました' }, { status: 500 });
    }

    if (!staff) {
      console.log("❌ スタッフが存在しません (REST):", staffId);
      // スタッフが見つからない場合でもエラーにせず成功と見なす
      return NextResponse.json({
        success: true,
        data: { isConfirmed: false }
      });
    }

    // シフト確定フラグを更新
    const { data, error } = await supabase
      .from('staff')
      .update({ is_shift_confirmed: false })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      console.error("❌ シフト確定取り消しエラー (REST):", error);
      return NextResponse.json({ success: false, error: 'シフト確定の取り消しに失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { isConfirmed: data.is_shift_confirmed }
    });
  } catch (error) {
    console.error('❌ シフト確定取り消しエラー (REST):', error);
    return NextResponse.json({ success: false, error: 'シフト確定の取り消しに失敗しました' }, { status: 500 });
  }
} 
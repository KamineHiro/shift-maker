import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse, ShiftData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET: スタッフ一覧を取得
export async function GET() {
  try {
    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*');

    if (error) {
      console.error('スタッフデータの取得エラー:', error);
      throw error;
    }

    const response: ApiResponse<ShiftData[]> = {
      success: true,
      data: staffData
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('スタッフデータの取得エラー:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'スタッフデータの取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST: 新しいスタッフを追加
export async function POST(request: Request) {
  try {
    const { name, groupId } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフ名は必須です'
      };
      
      return NextResponse.json(response, { status: 400 });
    }

    // UUIDを生成
    const id = uuidv4();
    
    // スタッフデータのInsert（user_idフィールドをデフォルトでnullに設定）
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([{ 
        id,
        name,
        group_id: groupId,
        user_id: null,
        role: 'staff'
      }])
      .select()
      .maybeSingle();

    if (error) {
      console.error('スタッフ追加エラー:', error);
      throw error;
    }
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: newStaff
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('スタッフの追加エラー:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'スタッフの追加に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
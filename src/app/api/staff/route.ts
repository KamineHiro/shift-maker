import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse, ShiftData } from '@/types';

// GET: スタッフ一覧を取得
export async function GET() {
  try {
    const supabase = createClient();
    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*');

    if (error) throw error;

    const response: ApiResponse<ShiftData[]> = {
      success: true,
      data: staffData
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'スタッフデータの取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST: 新しいスタッフを追加
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフ名は必須です'
      };
      
      return NextResponse.json(response, { status: 400 });
    }

    const supabase = createClient();
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: newStaff
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'スタッフの追加に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
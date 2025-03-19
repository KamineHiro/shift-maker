import { NextResponse } from 'next/server';
import { ApiResponse, ShiftData } from '@/types';
import { staffService } from '@/services/supabaseService';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: 特定のスタッフを取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    const staffResult = await staffService.getStaff(id);
    
    if (!staffResult) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: staffResult
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

// PUT: スタッフ情報を更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'スタッフ名は必須です' }, { status: 400 });
    }
    
    const updatedStaff = await staffService.updateStaff(id, name);
    
    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'スタッフ情報の更新に失敗しました' }, { status: 500 });
  }
}

// DELETE: スタッフを削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // 削除前にスタッフデータを取得
    const staff = await staffService.getStaff(id);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'スタッフが見つかりません' }, { status: 404 });
    }
    
    await staffService.deleteStaff(id);
    
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'スタッフの削除に失敗しました' }, { status: 500 });
  }
} 
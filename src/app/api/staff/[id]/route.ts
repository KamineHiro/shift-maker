import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ShiftData } from '@/types';
import { staffService } from '@/services/supabaseService';

interface RouteParams {
  params: Promise<{ id: string }>; // ✅ `params` を `Promise` で取得
}

// GET: 特定のスタッフを取得
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params; // ✅ `await` で `params` を取得
    
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
    console.error('スタッフデータの取得エラー:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'スタッフデータの取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT: スタッフ情報を更新
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params; // ✅ `await` で `params` を取得
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'スタッフ名は必須です' }, { status: 400 });
    }
    
    const updatedStaff = await staffService.updateStaff(id, name);
    
    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error) {
    console.error('スタッフ情報の更新エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'スタッフ情報の更新に失敗しました' 
    }, { status: 500 });
  }
}

// DELETE: スタッフを削除
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params; // ✅ `await` で `params` を取得
    
    // 削除前にスタッフデータを取得
    const staff = await staffService.getStaff(id);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'スタッフが見つかりません' }, { status: 404 });
    }
    
    await staffService.deleteStaff(id);
    
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('スタッフの削除エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'スタッフの削除に失敗しました' 
    }, { status: 500 });
  }
}

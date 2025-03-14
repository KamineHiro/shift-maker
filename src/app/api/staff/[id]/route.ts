import { NextResponse } from 'next/server';
import { staffData } from '@/data/mockData';
import { ApiResponse, ShiftData } from '@/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: 特定のスタッフを取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const staff = staffData.find(s => s.id === id);
    
    if (!staff) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: staff
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
    const staffIndex = staffData.findIndex(s => s.id === id);
    
    if (staffIndex === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフ名は必須です'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    staffData[staffIndex] = {
      ...staffData[staffIndex],
      name
    };
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: staffData[staffIndex]
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'スタッフ情報の更新に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE: スタッフを削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const staffIndex = staffData.findIndex(s => s.id === id);
    
    if (staffIndex === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const deletedStaff = staffData[staffIndex];
    staffData.splice(staffIndex, 1);
    
    const response: ApiResponse<ShiftData> = {
      success: true,
      data: deletedStaff
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'スタッフの削除に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
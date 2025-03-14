import { NextResponse } from 'next/server';
import { staffData } from '@/data/mockData';
import { ApiResponse, ShiftInfo } from '@/types';

interface RouteParams {
  params: {
    staffId: string;
    date: string;
  };
}

// GET: 特定のスタッフの特定の日付のシフト情報を取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { staffId, date } = params;
    const staff = staffData.find(s => s.id === staffId);
    
    if (!staff) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const shift = staff.shifts[date];
    
    const response: ApiResponse<ShiftInfo | null> = {
      success: true,
      data: shift || null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'シフト情報の取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT: 特定のスタッフの特定の日付のシフト情報を更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { staffId, date } = params;
    const staffIndex = staffData.findIndex(s => s.id === staffId);
    
    if (staffIndex === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const { startTime, endTime, isOff } = await request.json();
    
    // バリデーション
    if (isOff === undefined || typeof isOff !== 'boolean') {
      const response: ApiResponse<null> = {
        success: false,
        error: '休みフラグは必須です'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    if (!isOff) {
      if (!startTime || !endTime) {
        const response: ApiResponse<null> = {
          success: false,
          error: '開始時間と終了時間は必須です'
        };
        
        return NextResponse.json(response, { status: 400 });
      }
    }
    
    const shiftInfo: ShiftInfo = {
      startTime: startTime || '',
      endTime: endTime || '',
      isOff
    };
    
    // シフト情報を更新
    staffData[staffIndex] = {
      ...staffData[staffIndex],
      shifts: {
        ...staffData[staffIndex].shifts,
        [date]: shiftInfo
      }
    };
    
    const response: ApiResponse<ShiftInfo> = {
      success: true,
      data: shiftInfo
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'シフト情報の更新に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE: 特定のスタッフの特定の日付のシフト情報を削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { staffId, date } = params;
    const staffIndex = staffData.findIndex(s => s.id === staffId);
    
    if (staffIndex === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'スタッフが見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const staff = staffData[staffIndex];
    
    if (!staff.shifts[date]) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'シフト情報が見つかりません'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const deletedShift = staff.shifts[date];
    
    // シフト情報を削除
    const { [date]: _, ...remainingShifts } = staff.shifts;
    staffData[staffIndex] = {
      ...staff,
      shifts: remainingShifts
    };
    
    const response: ApiResponse<ShiftInfo> = {
      success: true,
      data: deletedShift
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'シフト情報の削除に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
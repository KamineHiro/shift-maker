import { NextResponse } from 'next/server';
import { staffData, dates } from '@/data/mockData';
import { ApiResponse } from '@/types';

// GET: 日付一覧を取得
export async function GET() {
  try {
    const response: ApiResponse<string[]> = {
      success: true,
      data: dates
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: '日付データの取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// GET: 日付一覧を取得
export async function GET() {
  try {
    const response: ApiResponse<string[]> = {
      success: true,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('日付データの取得エラー:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '日付データの取得に失敗しました'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
import { ShiftData } from '../types';

// 日付の生成ヘルパー関数
export const generateDates = (startDate: Date, days: number): string[] => {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    dates.push(`${month}/${day}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// サンプルデータの生成
const today = new Date();
export const dates = generateDates(today, 7);

// モックデータ
export let staffData: ShiftData[] = [
  {
    id: '1',
    name: '山田太郎',
    shifts: {
      [dates[0]]: { startTime: '9:00', endTime: '17:00', isOff: false },
      [dates[1]]: { startTime: '10:00', endTime: '18:00', isOff: false },
      [dates[2]]: { startTime: '', endTime: '', isOff: true },
    }
  },
  {
    id: '2',
    name: '佐藤花子',
    shifts: {
      [dates[0]]: { startTime: '13:00', endTime: '21:00', isOff: false },
      [dates[2]]: { startTime: '9:00', endTime: '17:00', isOff: false },
    }
  }
]; 
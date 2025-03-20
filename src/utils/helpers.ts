/**
 * 指定された長さのランダムな文字列を生成する
 * @param length 生成する文字列の長さ
 * @returns ランダムな文字列
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

/**
 * 日付をフォーマットする (YYYY-MM-DD)
 * @param date 日付オブジェクト
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 日付を表示用にフォーマットする (MM/DD)
 * @param dateString YYYY-MM-DD形式の日付文字列
 * @returns MM/DD形式の日付文字列
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  return `${month}/${day}(${dayOfWeek})`;
}

/**
 * 現在の日付から指定された日数分の日付配列を生成する
 * @param days 生成する日数
 * @returns YYYY-MM-DD形式の日付文字列の配列
 */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));
  }
  
  return dates;
} 
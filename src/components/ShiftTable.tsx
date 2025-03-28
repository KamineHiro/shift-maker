import React from 'react';
import { ShiftData } from '@/types';

interface ShiftTableProps {
  dates: string[];
  staffData: ShiftData[];
  onCellClick: (staffId: string, date: string) => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({ dates, staffData, onCellClick }) => {
  // 日付フォーマット関数
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${month}/${day}(${weekday})`;
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 border-b border-r">
              日付
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 border-b border-r">
              シフト
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 border-b">
              詳細
            </th>
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const staff = staffData[0]; // 特定のスタッフのシフトを表示
            const shift = staff?.shifts[date];
            
            let shiftContent = '休み';
            let shiftClass = 'bg-red-100';
            let shiftDetails = '休み';
            
            if (shift) {
              if (shift.isWorking) {
                if (shift.isAllDay) {
                  shiftContent = '全日OK';
                  shiftClass = 'bg-green-100';
                  shiftDetails = '勤務時間: 全日';
                } else {
                  shiftContent = `${shift.startTime} - ${shift.endTime}`;
                  shiftClass = 'bg-green-100';
                  shiftDetails = `勤務時間: ${shift.startTime} - ${shift.endTime}`;
                }
              }
            } else {
              shiftContent = '未設定';
              shiftClass = 'bg-gray-50';
              shiftDetails = '未設定';
            }
            
            return (
              <tr key={date} className="hover:bg-gray-50 transition-colors duration-150">
                <td 
                  className="px-4 py-4 whitespace-nowrap border-b border-r"
                  onClick={() => staff && onCellClick(staff.staff_id, date)}
                >
                  {formatDisplayDate(date)}
                </td>
                <td 
                  className={`px-4 py-4 whitespace-nowrap cursor-pointer border-b border-r ${shiftClass}`}
                  onClick={() => staff && onCellClick(staff.staff_id, date)}
                >
                  {shiftContent}
                </td>
                <td 
                  className="px-4 py-4 whitespace-nowrap border-b"
                  onClick={() => staff && onCellClick(staff.staff_id, date)}
                >
                  {shiftDetails}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-2 text-xs text-gray-500">
        ※セルをクリックしてシフトを編集できます
      </div>
    </div>
  );
};

export default ShiftTable; 
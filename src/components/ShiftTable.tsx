import React from 'react';
import { ShiftData, ShiftInfo } from '@/types';

interface ShiftTableProps {
  dates: string[];
  staffData: ShiftData[];
  onCellClick: (staffId: string, date: string) => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({ dates, staffData, onCellClick }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border border-gray-200 bg-gray-100">スタッフ名</th>
            {dates.map((date) => (
              <th 
                key={date} 
                className="px-4 py-2 border border-gray-200 bg-green-500 text-white"
              >
                {date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staffData.map((staff) => (
            <tr key={staff.staff_id}>
              <td className="px-4 py-2 border border-gray-200 font-medium">
                {staff.name}
              </td>
              {dates.map((date) => {
                const shift = staff.shifts[date];
                return (
                  <td 
                    key={`${staff.staff_id}-${date}`} 
                    className="px-4 py-2 border border-gray-200 text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => onCellClick(staff.staff_id, date)}
                  >
                    {shift ? (
                      !shift.isWorking ? (
                        <span className="text-red-500 font-bold">×</span>
                      ) : (
                        <span>
                          {shift.startTime}～{shift.endTime}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShiftTable; 
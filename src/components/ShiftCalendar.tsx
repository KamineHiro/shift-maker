import React from 'react';
import { ShiftData, ShiftInfo } from '@/types';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ShiftCalendarProps {
  dates: string[];
  staffList: ShiftData[];
  onShiftClick: (staffId: string, date: string, currentShift: ShiftInfo | undefined) => void;
}

export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
  dates,
  staffList,
  onShiftClick,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(date);
    const day = new Intl.DateTimeFormat('ja-JP', { day: 'numeric' }).format(date);
    return { weekday, day };
  };

  const getShiftStatusClass = (shift?: ShiftInfo) => {
    if (!shift) return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    if (!shift.isWorking) return 'bg-red-50 hover:bg-red-100 border-red-200';
    if (shift.isAllDay) return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
    return 'bg-green-50 hover:bg-green-100 border-green-200';
  };

  const getShiftTimeDisplay = (shift?: ShiftInfo) => {
    if (!shift || !shift.isWorking) return '休み';
    if (shift.isAllDay) return '全日';
    return `${shift.startTime}-${shift.endTime}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th scope="col" className="bg-gray-50 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
              スタッフ名
            </th>
            {dates.map((date) => {
              const { weekday, day } = formatDate(date);
              return (
                <th
                  key={date}
                  scope="col"
                  className="bg-gray-50 px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">{weekday}</span>
                    <span className="text-lg">{day}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {staffList.map((staff) => (
            <tr key={staff.staff_id} className="divide-x divide-gray-200">
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {staff.name}
              </td>
              {dates.map((date) => {
                const shift = staff.shifts[date];
                return (
                  <td
                    key={`${staff.staff_id}-${date}`}
                    className="p-0"
                  >
                    <button
                      onClick={() => onShiftClick(staff.staff_id, date, shift)}
                      className={`block w-full p-4 text-left transition-colors duration-200 border-l ${getShiftStatusClass(
                        shift
                      )}`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {getShiftTimeDisplay(shift)}
                        </span>
                      </div>
                      {shift?.note && (
                        <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {shift.note}
                        </div>
                      )}
                    </button>
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
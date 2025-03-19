import { useState, useEffect } from 'react';
import { ShiftData, ShiftInfo, Staff, Shift } from '@/types';
import { supabase } from '@/lib/supabaseClient';

export const useShiftData = () => {
  const [dates, setDates] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<ShiftData[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const generateWeekDates = (baseDate: Date) => {
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  };

  useEffect(() => {
    const weekDates = generateWeekDates(currentDate);
    setDates(weekDates);
    fetchStaffList(weekDates);
  }, [currentDate]);

  const fetchStaffList = async (targetDates: string[]) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*');

      if (staffError) throw staffError;

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('date', targetDates);

      if (shiftsError) throw shiftsError;

      const formattedStaffList: ShiftData[] = (staffData as Staff[]).map((staff) => ({
        staff_id: staff.id,
        name: staff.name,
        shifts: (shiftsData as Shift[])
          .filter((shift) => shift.staff_id === staff.id)
          .reduce((acc: Record<string, ShiftInfo>, shift) => {
            acc[shift.date] = {
              staff_id: shift.staff_id,
              date: shift.date,
              isWorking: shift.is_working,
              startTime: shift.start_time,
              endTime: shift.end_time,
              isAllDay: shift.is_all_day,
              note: shift.note,
            };
            return acc;
          }, {}),
      }));

      setStaffList(formattedStaffList);
    } catch (error) {
      console.error('スタッフデータの取得エラー:', error);
    }
  };

  const updateShift = async (shiftInfo: ShiftInfo) => {
    try {
      const { error } = await supabase.from('shifts').upsert({
        staff_id: shiftInfo.staff_id,
        date: shiftInfo.date,
        is_working: shiftInfo.isWorking,
        start_time: shiftInfo.startTime,
        end_time: shiftInfo.endTime,
        is_all_day: shiftInfo.isAllDay,
        note: shiftInfo.note,
      });

      if (error) throw error;

      // 更新後にデータを再取得
      await fetchStaffList(dates);
    } catch (error) {
      console.error('シフト更新エラー:', error);
      throw error;
    }
  };

  const setCurrentWeek = (type: 'previous' | 'next' | 'current') => {
    const newDate = new Date(currentDate);
    switch (type) {
      case 'previous':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'next':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'current':
        newDate.setTime(new Date().getTime());
        break;
    }
    setCurrentDate(newDate);
  };

  return {
    dates,
    staffList,
    updateShift,
    setCurrentWeek,
  };
}; 
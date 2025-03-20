import { useState, useEffect, useCallback } from 'react';
import { ShiftData, ShiftInfo } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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

  const fetchStaffList = useCallback(async (targetDates: string[]) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*');

      if (staffError) throw staffError;

      const staffWithShifts = await Promise.all(
        staffData.map(async (staff) => {
          const { data: shiftData, error: shiftError } = await supabase
            .from('shifts')
            .select('*')
            .in('date', targetDates)
            .eq('staff_id', staff.id);

          if (shiftError) throw shiftError;

          const shifts = shiftData.reduce((acc, shift) => {
            acc[shift.date] = shift;
            return acc;
          }, {} as Record<string, ShiftInfo>);

          return {
            staff_id: staff.id,
            name: staff.name,
            shifts
          };
        })
      );

      setStaffList(staffWithShifts);
    } catch (error) {
      console.error('スタッフリストの取得に失敗しました:', error);
    }
  }, []);

  useEffect(() => {
    const weekDates = generateWeekDates(currentDate);
    setDates(weekDates);
    fetchStaffList(weekDates);
  }, [currentDate, fetchStaffList]);

  const updateShift = async (shiftInfo: ShiftInfo) => {
    try {
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', shiftInfo.staff_id)
        .eq('date', shiftInfo.date)
        .maybeSingle();

      if (checkError) {
        console.error('シフト存在確認エラー:', checkError);
        throw checkError;
      }

      let error;
      if (existingShift) {
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            start_time: shiftInfo.startTime,
            end_time: shiftInfo.endTime,
            note: shiftInfo.note,
            is_off: !shiftInfo.isWorking
          })
          .eq('staff_id', shiftInfo.staff_id)
          .eq('date', shiftInfo.date);
        
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('shifts')
          .insert({
            id: uuidv4(),
            staff_id: shiftInfo.staff_id,
            date: shiftInfo.date,
            start_time: shiftInfo.startTime,
            end_time: shiftInfo.endTime,
            note: shiftInfo.note,
            is_off: !shiftInfo.isWorking
          });
        
        error = insertError;
      }

      if (error) throw error;

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
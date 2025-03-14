import React, { useState, useEffect } from 'react';
import { ShiftInfo } from '@/types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ShiftInfo) => void;
  staffName: string;
  date: string;
  currentShift?: ShiftInfo;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  staffName,
  date,
  currentShift
}) => {
  const [startTime, setStartTime] = useState(currentShift?.startTime || '9:00');
  const [endTime, setEndTime] = useState(currentShift?.endTime || '17:00');
  const [isWorking, setIsWorking] = useState(currentShift?.isWorking ?? true);
  const [note, setNote] = useState(currentShift?.note || '');
  const [isAllDay, setIsAllDay] = useState(currentShift?.isAllDay ?? false);

  // 全日OKが選択された場合、時間を自動設定
  useEffect(() => {
    if (isAllDay) {
      setStartTime('9:00');
      setEndTime('22:00');
    }
  }, [isAllDay]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      startTime,
      endTime,
      isWorking,
      note,
      isAllDay
    });
    onClose();
  };

  // 時間選択用の選択肢を生成（9:00から22:00まで、30分単位）
  const timeOptions = [];
  for (let hour = 9; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // 22:30は含めない
      if (hour === 22 && minute === 30) continue;
      
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">シフト入力</h2>
        <p className="mb-4">
          <span className="font-medium">{staffName}</span> - <span className="text-green-600">{date}</span>
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!isWorking}
                onChange={(e) => setIsWorking(!e.target.checked)}
                className="mr-2"
              />
              <span>休み</span>
            </label>
            
            {isWorking && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="mr-2"
                  disabled={!isWorking}
                />
                <span>全日OK（9:00-22:00）</span>
              </label>
            )}
          </div>

          {isWorking && !isAllDay && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1 font-medium">開始時間</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled={!isWorking || isAllDay}
                >
                  {timeOptions.map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">終了時間</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled={!isWorking || isAllDay}
                >
                  {timeOptions.map((time) => (
                    <option key={`end-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isWorking && isAllDay && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
              <p>全日OK設定中: 9:00から22:00まで勤務可能</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-1 font-medium">備考</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              rows={3}
              placeholder="備考があれば入力してください"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal; 
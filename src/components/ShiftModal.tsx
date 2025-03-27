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
  const [startTime, setStartTime] = useState(currentShift?.startTime || '10:00');
  const [endTime, setEndTime] = useState(currentShift?.endTime || '17:00');
  const [isWorking, setIsWorking] = useState(currentShift?.isWorking ?? true);
  const [note, setNote] = useState(currentShift?.note || '');
  const [message, setMessage] = useState(currentShift?.message || '');
  const [shiftType, setShiftType] = useState<'custom' | 'lunch-early' | 'lunch-late' | 'dinner-early' | 'dinner-late' | 'allday'>('custom');
  const [isVisible, setIsVisible] = useState(false);

  // モーダルが開いたときのアニメーション用
  useEffect(() => {
    if (isOpen) {
      // わずかな遅延を入れてCSSトランジションが機能するようにする
      setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // currentShiftが変更された場合にフォームを更新
  useEffect(() => {
    if (currentShift) {
      console.log('モーダルに現在のシフト情報を設定:', currentShift);
      setStartTime(currentShift.startTime || '10:00');
      setEndTime(currentShift.endTime || '17:00');
      setIsWorking(currentShift.isWorking ?? true);
      setNote(currentShift.note || '');
      setMessage(currentShift.message || '');
      
      // シフトタイプを設定
      if (currentShift.isAllDay) {
        setShiftType('allday');
      } else if (currentShift.startTime === '10:00' && currentShift.endTime === '16:00') {
        setShiftType('lunch-early');
      } else if (currentShift.startTime === '11:00' && currentShift.endTime === '16:00') {
        setShiftType('lunch-late');
      } else if (currentShift.startTime === '16:00' && currentShift.endTime === '22:00') {
        setShiftType('dinner-early');
      } else if (currentShift.startTime === '17:00' && currentShift.endTime === '22:00') {
        setShiftType('dinner-late');
      } else {
        setShiftType('custom');
      }
    } else {
      // リセット
      console.log('モーダルのシフト情報をリセット');
      setStartTime('10:00');
      setEndTime('17:00');
      setIsWorking(true);
      setNote('');
      setMessage('');
      setShiftType('custom');
    }
  }, [currentShift, date]);

  // シフトタイプが変更された時の処理
  useEffect(() => {
    if (shiftType === 'lunch-early') {
      setStartTime('10:00');
      setEndTime('16:00');
    } else if (shiftType === 'lunch-late') {
      setStartTime('11:00');
      setEndTime('16:00');
    } else if (shiftType === 'dinner-early') {
      setStartTime('16:00');
      setEndTime('22:00');
    } else if (shiftType === 'dinner-late') {
      setStartTime('17:00');
      setEndTime('22:00');
    } else if (shiftType === 'allday') {
      setStartTime('09:00');
      setEndTime('22:00');
    }
  }, [shiftType]);

  // モーダルを閉じる前にアニメーション実行
  const handleClose = () => {
    setIsVisible(false);
    // アニメーション終了後に実際に閉じる
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newShiftInfo: ShiftInfo = {
      startTime,
      endTime,
      isWorking,
      note,
      message,
      isAllDay: shiftType === 'allday',
      // TypeScript型定義上は必要だが、実際の値は上位コンポーネントで設定される
      staff_id: '',
      date: ''
    };
    
    console.log('シフト保存を試行:', newShiftInfo);
    onSave(newShiftInfo);
    handleClose();
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
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-400 bg-opacity-5 px-4"
      style={{ display: isVisible ? 'block' : 'none' }}
      onClick={handleClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`bg-white rounded-lg p-5 w-full max-w-md mx-6 shadow-xl transition-all duration-300 transform ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-5">シフト入力</h2>
          <p className="mb-5">
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
            </div>

            {isWorking && (
              <div className="mb-4">
                <label className="block mb-2 font-medium">シフトタイプ</label>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">ランチシフト</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'lunch-early' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="shiftType"
                        checked={shiftType === 'lunch-early'}
                        onChange={() => setShiftType('lunch-early')}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium block">早め</span>
                        <span className="text-sm text-gray-600">10:00 - 16:00</span>
                      </div>
                    </label>
                    <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'lunch-late' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="shiftType"
                        checked={shiftType === 'lunch-late'}
                        onChange={() => setShiftType('lunch-late')}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium block">遅め</span>
                        <span className="text-sm text-gray-600">11:00 - 16:00</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">ディナーシフト</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'dinner-early' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="shiftType"
                        checked={shiftType === 'dinner-early'}
                        onChange={() => setShiftType('dinner-early')}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium block">早め</span>
                        <span className="text-sm text-gray-600">16:00 - 22:00</span>
                      </div>
                    </label>
                    <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'dinner-late' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="shiftType"
                        checked={shiftType === 'dinner-late'}
                        onChange={() => setShiftType('dinner-late')}
                        className="mr-2"
                      />
                      <div>
                        <span className="font-medium block">遅め</span>
                        <span className="text-sm text-gray-600">17:00 - 22:00</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'allday' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="shiftType"
                      checked={shiftType === 'allday'}
                      onChange={() => setShiftType('allday')}
                      className="mr-2"
                    />
                    <div>
                      <span className="font-medium block">全日勤務</span>
                      <span className="text-sm text-gray-600">09:00 - 22:00</span>
                    </div>
                  </label>
                </div>
                
                <label className={`border rounded-lg p-3 flex items-center cursor-pointer transition-all duration-200 ${shiftType === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="shiftType"
                    checked={shiftType === 'custom'}
                    onChange={() => setShiftType('custom')}
                    className="mr-2"
                  />
                  <span className="font-medium">時間を指定する</span>
                </label>
              </div>
            )}

            {isWorking && shiftType === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">開始時間</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
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

            {isWorking && shiftType !== 'custom' && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded transition-all duration-200">
                {shiftType === 'lunch-early' && <p>ランチ早番: 10:00から16:00まで勤務</p>}
                {shiftType === 'lunch-late' && <p>ランチ遅番: 11:00から16:00まで勤務</p>}
                {shiftType === 'dinner-early' && <p>ディナー早番: 16:00から22:00まで勤務</p>}
                {shiftType === 'dinner-late' && <p>ディナー遅番: 17:00から22:00まで勤務</p>}
                {shiftType === 'allday' && <p>全日勤務: 09:00から22:00まで勤務</p>}
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

            <div className="mb-4">
              <label className="block mb-1 font-medium text-blue-600">管理者からのメッセージ</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded bg-blue-50"
                rows={3}
                placeholder="スタッフに表示されるメッセージを入力してください"
              />
              <p className="text-xs text-gray-500 mt-1">※このメッセージはスタッフのシフト画面に表示されます</p>
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors duration-200"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal; 
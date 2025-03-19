import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { ShiftInfo } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ShiftEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftInfo: ShiftInfo) => void;
  currentShift?: ShiftInfo;
  staffName: string;
  date: string;
}

export const ShiftEditModal: React.FC<ShiftEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentShift,
  staffName,
  date,
}) => {
  const [isWorking, setIsWorking] = useState(currentShift?.isWorking ?? true);
  const [startTime, setStartTime] = useState(currentShift?.startTime ?? '9:00');
  const [endTime, setEndTime] = useState(currentShift?.endTime ?? '17:00');
  const [note, setNote] = useState(currentShift?.note ?? '');
  const [isAllDay, setIsAllDay] = useState(currentShift?.isAllDay ?? false);

  const handleSave = () => {
    onSave({
      isWorking,
      startTime,
      endTime,
      note,
      isAllDay,
      staff_id: currentShift?.staff_id ?? '',
      date,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date(dateStr));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold text-gray-900"
                  >
                    シフト編集
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-6 rounded-lg bg-gray-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">スタッフ</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{staffName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">日付</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        勤務状態
                      </label>
                      <div className="flex gap-4">
                        <label className="relative flex cursor-pointer items-center">
                          <input
                            type="radio"
                            checked={isWorking}
                            onChange={() => setIsWorking(true)}
                            className="peer sr-only"
                          />
                          <div className="peer-checked:border-primary-500 peer-checked:bg-primary-50 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-medium text-gray-900">出勤</span>
                          </div>
                        </label>
                        <label className="relative flex cursor-pointer items-center">
                          <input
                            type="radio"
                            checked={!isWorking}
                            onChange={() => setIsWorking(false)}
                            className="peer sr-only"
                          />
                          <div className="peer-checked:border-red-500 peer-checked:bg-red-50 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="font-medium text-gray-900">休み</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {isWorking && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              開始時間
                            </label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              終了時間
                            </label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={isAllDay}
                              onChange={(e) => setIsAllDay(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300" />
                            <span className="ml-3 text-sm font-medium text-gray-700">全日対応可能</span>
                          </label>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        備考
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="備考を入力..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    保存
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
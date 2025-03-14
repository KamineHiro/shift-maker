import React, { useState } from 'react';

interface StaffFormProps {
  onAddStaff: (name: string) => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ onAddStaff }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('スタッフ名を入力してください');
      return;
    }
    
    onAddStaff(name);
    setName('');
    setError('');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-lg font-bold mb-4">スタッフ追加</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-grow">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="スタッフ名を入力"
            className="w-full p-2 border border-gray-300 rounded"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          追加
        </button>
      </form>
    </div>
  );
};

export default StaffForm; 
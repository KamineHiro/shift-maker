import React from 'react';

type Role = 'staff' | 'manager';

interface RoleToggleProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

const RoleToggle: React.FC<RoleToggleProps> = ({ currentRole, onRoleChange }) => {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <span className="font-medium">表示モード：</span>
      <div className="flex bg-gray-200 rounded-lg overflow-hidden">
        <button
          className={`px-4 py-2 ${
            currentRole === 'staff'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => onRoleChange('staff')}
        >
          バイト生
        </button>
        <button
          className={`px-4 py-2 ${
            currentRole === 'manager'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => onRoleChange('manager')}
        >
          社員（管理者）
        </button>
      </div>
    </div>
  );
};

export default RoleToggle; 
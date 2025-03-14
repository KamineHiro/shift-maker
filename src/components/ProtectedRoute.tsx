import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['staff', 'manager'] 
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // ユーザーの役割が許可されていない場合
      if (user.role === 'manager') {
        router.push('/manager');
      } else {
        router.push('/staff');
      }
    }
  }, [user, loading, router, allowedRoles]);

  // ローディング中または認証されていない場合はローディング表示
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ユーザーの役割が許可されていない場合
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  // 認証されている場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute; 
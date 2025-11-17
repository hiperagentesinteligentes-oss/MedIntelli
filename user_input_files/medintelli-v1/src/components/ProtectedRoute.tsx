import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Usar window.location.href para forcir redirecionamento completo
    // Isso resolve o problema de F5 onde o Navigate nao funciona corretamente
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    // Fallback caso o useEffect nao execute
    window.location.href = '/login';
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Voce nao tem permissao para acessar esta pagina.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

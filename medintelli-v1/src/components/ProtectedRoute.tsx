import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, session } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Redirecionamento direto apenas se realmente não há sessão válida
    if (!loading && (!session || !user)) {
      setRedirecting(true);
      console.warn('Sessão inválida ou expirada, redirecionando para login...');
      // Usar timeout para evitar loop e permitir o carregamento suave
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return;
    }

    // Redirecionamento se não tiver perfil (após verificar que há sessão)
    if (!loading && user && !profile) {
      setRedirecting(true);
      console.warn('Usuário sem perfil, criando redirecionamento...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return;
    }

    // Verificar roles se especificadas
    if (!loading && profile && allowedRoles && !allowedRoles.includes(profile.role)) {
      console.warn('Usuário sem permissão para esta página');
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
  }, [loading, user, profile, allowedRoles, session]);

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">Usuário: {user.email}</p>
          )}
        </div>
      </div>
    );
  }

  // Mostrar mensagem elegante durante redirecionamento
  if (redirecting || !user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <p className="text-gray-700 mb-4">
            {!user ? '🔒 Verificando autenticação...' : '🔄 Carregando perfil...'}
          </p>
          <p className="text-sm text-gray-500">
            Aguarde um momento, você será redirecionado automaticamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  // Verificar roles novamente antes de renderizar
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
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

  // Se chegou aqui, pode renderizar o conteúdo
  return <>{children}</>;
}

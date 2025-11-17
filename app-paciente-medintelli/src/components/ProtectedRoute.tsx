import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Redirecionamento apenas se realmente não há sessão válida
    if (!loading && (!session || !user)) {
      setRedirecting(true);
      console.warn('Sessão inválida ou expirada, redirecionando para login...');
      // Usar timeout para evitar loop
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return;
    }
  }, [loading, user, session]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Verificando autenticação...</p>
          {user && (
            <p className="text-xs text-gray-500 mt-1">Usuário: {user.email}</p>
          )}
        </div>
      </div>
    );
  }

  // Mostrar mensagem elegante durante redirecionamento
  if (redirecting || !user || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <div className="mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
          <p className="text-gray-700 mb-4">
            🔒 Sua sessão expirou ou foi invalidada.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Você será redirecionado para fazer login novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Fazer login novamente
          </button>
        </div>
      </div>
    );
  }

  // Se não tem usuário válido, redirecionar para login (salvando URL atual)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
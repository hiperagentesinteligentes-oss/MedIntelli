import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const router = useNavigate();

  useEffect(() => {
    // Não fazer nada se ainda carregando
    if (loading) return;
    
    // Se não tem usuário e não está em login, redirecionar
    if (!user && router && location.pathname !== '/login') {
      // Forçar redirecionamento sem cache
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        return;
      }
      router('/login', { replace: true });
    }
    
    // Se tem usuário e está em login, redirecionar para chat
    if (user && router && location.pathname === '/login') {
      if (typeof window !== 'undefined') {
        window.location.href = '/chat';
        return;
      }
      router('/chat', { replace: true });
    }
  }, [user, loading, router, location.pathname]);

  // Mostrar loading enquanto verifica autenticacao
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

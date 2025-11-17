import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import ChatPage from '@/pages/ChatPage';
import AgendamentosPage from '@/pages/AgendamentosPage';
import HistoricoPage from '@/pages/HistoricoPage';
import PerfilPage from '@/pages/PerfilPage';
import { supabase } from '@/lib/supabase';

function App() {
  // Forçar verificação de sessão no carregamento (CRÍTICO para F5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Preservar página de login se usuário já está logado
      const verificarSessaoAtrasada = setTimeout(() => {
        if (window.location.pathname === '/login' && !document.hidden) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
              // Usuário já logado, redirecionar para chat
              window.location.href = '/chat';
            }
          });
        }
      }, 100);
      
      return () => clearTimeout(verificarSessaoAtrasada);
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas protegidas */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/agendamentos" element={<AgendamentosPage />} />
                    <Route path="/historico" element={<HistoricoPage />} />
                    <Route path="/perfil" element={<PerfilPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import ChatPage from '@/pages/ChatPage';
import AgendamentosPageSimple from '@/pages/AgendamentosPageSimple';
import HistoricoPage from '@/pages/HistoricoPage';
import PerfilPage from '@/pages/PerfilPage';
import { supabase } from '@/lib/supabase';

function App() {
  // App principal - sem redirects aqui para evitar loops
  // Todos os redirects são controlados pelo AuthContext e ProtectedRoute

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
                    <Route path="/agendamentos" element={<AgendamentosPageSimple />} />
                    <Route path="/historico" element={<HistoricoPage />} />
                    <Route path="/perfil" element={<PerfilPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

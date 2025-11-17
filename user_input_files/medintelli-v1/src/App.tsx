import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AgendaPage from '@/pages/AgendaPage';
import FilaEsperaPage from '@/pages/FilaEsperaPage';
import PacientesPage from '@/pages/PacientesPage';
import WhatsAppPage from '@/pages/WhatsAppPage';
import PainelMensagensPage from '@/pages/PainelMensagensPage';
import FeriadosPage from '@/pages/FeriadosPage';
import UsuariosPage from '@/pages/UsuariosPage';
import DashboardMedicoPage from '@/pages/DashboardMedicoPage';
import PainelPacientePage from '@/pages/PainelPacientePage';
import WhatsAppConfigPage from '@/pages/WhatsAppConfigPage';
import BaseConhecimentoPage from '@/pages/BaseConhecimentoPage';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function App() {
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  // Verificacao forcada de sessao no carregamento para resolver problema de F5
  useEffect(() => {
    const verificarSessaoInicial = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Sessao verificada no App.tsx:', session ? 'Ativa' : 'Inativa');
      } catch (error) {
        console.error('Erro ao verificar sessao:', error);
      } finally {
        // Timeout para garantir que o AuthContext carregue completamente
        setTimeout(() => {
          setVerificandoSessao(false);
        }, 300);
      }
    };

    verificarSessaoInicial();
  }, []);

  if (verificandoSessao) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Inicializando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agenda"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar']}>
                <AgendaPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/fila-espera"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria', 'auxiliar']}>
                <FilaEsperaPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
                <PacientesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria']}>
                <WhatsAppPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/painel-mensagens"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
                <PainelMensagensPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/feriados"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria']}>
                <FeriadosPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard-medico"
            element={
              <ProtectedRoute allowedRoles={['medico']}>
                <DashboardMedicoPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/painel-paciente"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
                <PainelPacientePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/config/whatsapp"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
                <WhatsAppConfigPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/config/base-conhecimento"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
                <BaseConhecimentoPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

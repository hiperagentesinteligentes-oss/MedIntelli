import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContextSimple';
import ProtectedRoute from '@/components/ProtectedRoute';
import LayoutCompleto from '@/components/LayoutCompleto';
import LoginCustom from '@/pages/LoginCustom';
import DashboardCompleto from '@/pages/DashboardCompleto';
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
import ValidacaoPage from '@/pages/ValidacaoPage';
import ValidacaoPublicaPage from '@/pages/ValidacaoPublicaPage';
import DiagnosticsFull from '@/pages/diagnostics-full';

function AppContent() {
  const { loading } = useAuth();

  // Página inicial só renderiza quando loading === false
  if (loading) {
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
      <Routes>
        <Route path="/login" element={<LoginCustom />} />
        <Route path="/validacao" element={<ValidacaoPublicaPage />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LayoutCompleto>
                <DashboardCompleto />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/agenda"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar']}>
              <LayoutCompleto>
                <AgendaPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fila-espera"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria', 'auxiliar']}>
              <LayoutCompleto>
                <FilaEsperaPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/pacientes"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
              <LayoutCompleto>
                <PacientesPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/whatsapp"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria']}>
              <LayoutCompleto>
                <WhatsAppPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/painel-mensagens"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
              <LayoutCompleto>
                <PainelMensagensPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/feriados"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'secretaria']}>
              <LayoutCompleto>
                <FeriadosPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
              <LayoutCompleto>
                <UsuariosPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard-medico"
          element={
            <ProtectedRoute allowedRoles={['medico']}>
              <LayoutCompleto>
                <DashboardMedicoPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/painel-paciente"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador', 'medico', 'secretaria']}>
              <LayoutCompleto>
                <PainelPacientePage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/config/whatsapp"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
              <LayoutCompleto>
                <WhatsAppConfigPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/config/base-conhecimento"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
              <LayoutCompleto>
                <BaseConhecimentoPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/validacao-interna"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
              <LayoutCompleto>
                <ValidacaoPage />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/diagnostics-full"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'administrador']}>
              <LayoutCompleto>
                <DiagnosticsFull />
              </LayoutCompleto>
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
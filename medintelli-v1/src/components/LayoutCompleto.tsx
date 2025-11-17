import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { 
  Home, 
  Calendar, 
  Users, 
  Clock, 
  MessageSquare, 
  Phone, 
  CalendarDays, 
  Settings, 
  FileText, 
  Bot,
  LogOut,
  Shield
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  console.log('🏗️ Layout completo renderizando...', { profile: !!profile });

  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: Home,
      roles: ['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar']
    },
    {
      path: '/agenda',
      label: 'Agenda',
      icon: Calendar,
      roles: ['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar']
    },
    {
      path: '/pacientes',
      label: 'Pacientes',
      icon: Users,
      roles: ['super_admin', 'administrador', 'medico', 'secretaria']
    },
    {
      path: '/fila-espera',
      label: 'Fila de Espera',
      icon: Clock,
      roles: ['super_admin', 'administrador', 'secretaria', 'auxiliar']
    },
    {
      path: '/whatsapp',
      label: 'WhatsApp',
      icon: Phone,
      roles: ['super_admin', 'administrador', 'secretaria']
    },
    {
      path: '/painel-mensagens',
      label: 'Mensagens',
      icon: MessageSquare,
      roles: ['super_admin', 'administrador', 'medico', 'secretaria']
    },
    {
      path: '/feriados',
      label: 'Feriados',
      icon: CalendarDays,
      roles: ['super_admin', 'administrador', 'secretaria']
    },
    {
      path: '/dashboard-medico',
      label: 'Dashboard Médico',
      icon: FileText,
      roles: ['medico', 'administrador', 'super_admin']
    },
    {
      path: '/painel-paciente',
      label: 'App Paciente',
      icon: Bot,
      roles: ['super_admin', 'administrador', 'medico', 'secretaria']
    },
    {
      path: '/usuarios',
      label: 'Usuários',
      icon: Shield,
      roles: ['super_admin', 'administrador']
    },
    {
      path: '/config/whatsapp',
      label: 'Config WhatsApp',
      icon: Settings,
      roles: ['super_admin', 'administrador']
    },
    {
      path: '/config/base-conhecimento',
      label: 'Base de Conhecimento',
      icon: FileText,
      roles: ['super_admin', 'administrador']
    },
    {
      path: '/validacao-interna',
      label: 'Validação',
      icon: Shield,
      roles: ['super_admin', 'administrador']
    }
  ];

  // Filtrar itens baseado na role do usuário
  const availableItems = menuItems.filter(item => 
    !profile?.role || item.roles.includes(profile.role)
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Header da Sidebar */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#3b82f6',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              M
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                MedIntelli
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Sistema de Gestão Médica
              </p>
            </div>
          </div>
        </div>

        {/* Menu de Navegação */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <div style={{ padding: '0 1rem' }}>
            {availableItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.25rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive ? '#1d4ed8' : '#374151',
                    backgroundColor: isActive ? '#dbeafe' : 'transparent',
                    fontWeight: isActive ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Perfil do Usuário */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              {(profile?.nome || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                {profile?.nome || 'Usuário'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                {profile?.role || 'Usuário'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              {availableItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Sistema Principal MedIntelli - Gerencie sua clínica com eficiência
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              ✅ Sistema Ativo
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main style={{ 
          flex: 1, 
          padding: '2rem', 
          overflowY: 'auto',
          backgroundColor: '#f8fafc'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
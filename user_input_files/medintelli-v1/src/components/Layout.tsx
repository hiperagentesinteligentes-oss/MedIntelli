import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  ClipboardList, 
  Sun, 
  Settings,
  UserCircle,
  LogOut,
  Bell,
  Smartphone,
  Menu,
  X,
  BookOpen,
  Inbox
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: ClipboardList, roles: ['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar'] },
    { path: '/agenda', label: 'Agenda', icon: Calendar, roles: ['super_admin', 'administrador', 'medico', 'secretaria', 'auxiliar'] },
    { path: '/fila-espera', label: 'Fila de Espera', icon: Users, roles: ['super_admin', 'administrador', 'secretaria', 'auxiliar'] },
    { path: '/pacientes', label: 'Pacientes', icon: Users, roles: ['super_admin', 'administrador', 'medico', 'secretaria'] },
    { path: '/painel-paciente', label: 'App Paciente', icon: Smartphone, roles: ['super_admin', 'administrador', 'medico', 'secretaria'] },
    { path: '/whatsapp', label: 'WhatsApp', icon: MessageSquare, roles: ['super_admin', 'administrador', 'secretaria'] },
    { path: '/painel-mensagens', label: 'Painel de Mensagens', icon: Inbox, roles: ['super_admin', 'administrador', 'medico', 'secretaria'] },
    { path: '/config/whatsapp', label: 'Config WhatsApp', icon: Settings, roles: ['super_admin', 'administrador'] },
    { path: '/config/base-conhecimento', label: 'Base Conhecimento', icon: BookOpen, roles: ['super_admin', 'administrador'] },
    { path: '/feriados', label: 'Feriados', icon: Sun, roles: ['super_admin', 'administrador', 'secretaria'] },
    { path: '/usuarios', label: 'Usuários', icon: Settings, roles: ['super_admin', 'administrador'] },
  ];

  if (profile?.role === 'medico') {
    navItems.push({ 
      path: '/dashboard-medico', 
      label: 'Meus Alertas', 
      icon: Bell, 
      roles: ['medico'] 
    });
  }

  const filteredNavItems = navItems.filter(item => 
    hasRole(item.roles as any[])
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Modern Header with Gradient */}
      <header className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200 shadow-lg">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MedIntelli
                </span>
                <p className="text-xs text-gray-500 -mt-1">Sistema de Gestão</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center px-8">
              {filteredNavItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* More Menu Dropdown for Desktop */}
              {filteredNavItems.length > 5 && (
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span>Mais</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                    {filteredNavItems.slice(5).map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-sm">
                      {profile?.nome?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right hidden xl:block">
                    <p className="text-sm font-medium text-gray-900">{profile?.nome}</p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.nome}</p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-16 right-0 bottom-0 w-80 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto">
              <div className="p-6 space-y-1">
                {/* Mobile User Info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold">
                        {profile?.nome?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{profile?.nome}</p>
                      <p className="text-xs opacity-90 capitalize">{profile?.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Nav Items */}
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                {/* Mobile Logout */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content with Subtle Animation */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        {children}
      </main>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

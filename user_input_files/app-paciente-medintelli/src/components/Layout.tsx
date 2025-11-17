import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Calendar, Clock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { paciente } = useAuth();

  const navItems = [
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/agendamentos', icon: Calendar, label: 'Agendar' },
    { path: '/historico', icon: Clock, label: 'Histórico' },
    { path: '/perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

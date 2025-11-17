import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types';

interface UserSession {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  profile_id: string;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão do localStorage na inicialização
  useEffect(() => {
    const loadSavedSession = async () => {
      try {
        console.log('🔍 Verificando sessão salva...');
        
        const savedSessionStr = localStorage.getItem('medintelli_user_session');
        if (savedSessionStr) {
          const savedSession: UserSession = JSON.parse(savedSessionStr);
          const now = Date.now();
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          
          if (now - savedSession.timestamp < maxAge) {
            console.log('✅ Sessão válida encontrada:', savedSession.nome);
            
            // Usar ANON_KEY como token para Edge Functions que aceitam esse token
            const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI';
            
            // Criar mock user e session para compatibilidade
            const mockUser = {
              id: savedSession.id,
              email: savedSession.email,
              user_metadata: { nome: savedSession.nome },
              app_metadata: { role: savedSession.role },
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as unknown as User;
            
            const mockSession = {
              access_token: accessToken,
              refresh_token: 'mock_refresh',
              user: mockUser
            };
            
            const mockProfile = {
              id: savedSession.profile_id,
              user_id: savedSession.id,
              email: savedSession.email,
              nome: savedSession.nome,
              role: savedSession.role,
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as UserProfile;
            
            setUser(mockUser);
            setSession(mockSession);
            setProfile(mockProfile);
          } else {
            console.log('⏰ Sessão expirada, removendo...');
            localStorage.removeItem('medintelli_user_session');
          }
        } else {
          console.log('❌ Nenhuma sessão salva encontrada');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar sessão:', error);
        localStorage.removeItem('medintelli_user_session');
      } finally {
        setLoading(false);
      }
    };

    loadSavedSession();
  }, []);

  // Função de login customizada
  const signIn = async (email: string, password: string) => {
    // Esta função não é mais usada diretamente
    // O LoginCustom.tsx faz a validação e salva no localStorage
    throw new Error('Use LoginCustom para login');
  };

  // Função de logout
  const signOut = async () => {
    console.log('🚪 Fazendo logout...');
    
    try {
      localStorage.removeItem('medintelli_user_session');
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar logout mesmo com erro
      localStorage.removeItem('medintelli_user_session');
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  // Verificar roles
  const hasRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: '16px' }}>Carregando...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
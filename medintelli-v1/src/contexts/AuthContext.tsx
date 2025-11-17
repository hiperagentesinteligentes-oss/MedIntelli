import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, FUNCTION_URL } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 🔹 1. Verificação inicial da sessão
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        console.log('🔍 Verificando sessão inicial...');
        
        const { data } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (data?.session?.user) {
          console.log('✅ Sessão encontrada:', data.session.user.email);
          setUser(data.session.user);
          setSession(data.session);
          
          // Buscar perfil do usuário
          await loadUserProfile(data.session.user.id, data.session.user.email);
        } else {
          console.log('❌ Nenhuma sessão encontrada');
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('✅ Inicialização completa');
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    initializeAuth();

    // 🔹 2. Escuta mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔔 Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 Usuário logado:', session.user.email);
          setUser(session.user);
          setSession(session);
          await loadUserProfile(session.user.id, session.user.email);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário deslogado');
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          setSession(session);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 3. Carregar perfil do usuário com timeout
  async function loadUserProfile(userId: string, email: string) {
    console.log('👤 [INÍCIO] Carregando perfil para:', email);
    
    // Timeout de 10 segundos (aumentado para evitar fallback desnecessário)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao carregar perfil')), 10000)
    );
    
    const profilePromise = async () => {
      try {
        console.log('🔍 [1/2] Buscando perfil por user_id...');
        
        // Buscar por user_id primeiro
        let { data: perfil, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          console.log('🔍 [2/2] Perfil não encontrado por user_id, buscando por email...');
          // Se não encontrar por user_id, buscar por email
          const { data: perfilByEmail } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email)
            .single();
          
          perfil = perfilByEmail;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar perfil:', error);
          throw error;
        }

        if (perfil) {
          console.log('✅ [SUCESSO] Perfil carregado:', perfil.role, perfil.nome);
          return perfil;
        } else {
          console.warn('⚠️ [FALHA] Nenhum perfil encontrado para:', email);
          throw new Error('Perfil não encontrado');
        }
      } catch (error) {
        console.error('❌ [ERRO] Falha ao carregar perfil:', error);
        throw error;
      }
    };

    try {
      // Race entre busca normal e timeout
      const result = await Promise.race([profilePromise(), timeoutPromise]);
      console.log('✅ [RESULTADO] Perfil encontrado:', result);
      setProfile(result);
    } catch (error) {
      console.error('❌ [ERRO_CRÍTICO] Falha ao carregar perfil:', error.message);
      // NÃO criar perfil fallback - forçar logout
      console.log('🚪 Fazendo logout devido a erro no perfil...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      window.location.href = '/login';
    }
  }

  // 🔹 4. Função de login
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Tentando login para:', email);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ Login bem-sucedido');
      
      // O onAuthStateChange vai tratar o resto
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setLoading(false);
      throw error;
    }
  };

  // 🔹 5. Função de logout
  const signOut = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      setLoading(true);
      
      await supabase.auth.signOut();
      
      // Limpar estado
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar logout mesmo com erro
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  // 🔹 6. Verificar roles
  const hasRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  // 🔹 7. Loading screen
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

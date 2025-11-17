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



  useEffect(() => {
    let ativo = true;
    
    // Carregar sessao inicial com getSession() para garantir persistencia no F5
    async function carregarSessaoInicial() {
      try {
        setLoading(true);
        
        // Usar getSession() em vez de getUser() para melhor persistencia
        const { data: { session: sessaoAtual }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessao:', sessionError);
          if (ativo) {
            setUser(null);
            setProfile(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }
        
        if (!sessaoAtual?.user || !ativo) {
          if (ativo) {
            setUser(null);
            setProfile(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }
        
        // Buscar perfil do usuario
        const { data: perfil, error: perfilError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', sessaoAtual.user.id)
          .single();
          
        if (perfilError) {
          console.error('Erro ao buscar perfil:', perfilError);
        }
        
        if (ativo) {
          setUser(sessaoAtual.user);
          setProfile(perfil || null);
          setSession(sessaoAtual);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar sessao inicial:', error);
        if (ativo) {
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
        }
      }
    }
    
    carregarSessaoInicial();
    
    // Listener para mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evento, sessaoAtual) => {
      if (!ativo) return;
      
      console.log('Auth state changed:', evento);
      
      if (evento === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }
      
      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        if (sessaoAtual?.user) {
          // Buscar perfil do usuario
          const { data: perfil } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', sessaoAtual.user.id)
            .single();
          
          setUser(sessaoAtual.user);
          setProfile(perfil || null);
          setSession(sessaoAtual);
          setLoading(false);
        }
      }
    });
    
    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

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

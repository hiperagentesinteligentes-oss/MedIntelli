import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Paciente } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  paciente: Paciente | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    let ativo = true;
    
    async function carregar() {
      setLoading(true);
      
      try {
        // Verificar sessão existente (MELHOR que getUser para persistência)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          if (ativo) {
            setUser(null);
            setPaciente(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }
        
        if (session && session.user) {
          // Sessão existe, buscar perfil do paciente
          const { data: paciente, error: pacienteError } = await supabase
            .from('pacientes')
            .select('*')
            .eq('profile_id', session.user.id)
            .single();
            
          if (pacienteError) {
            console.error('Erro ao buscar perfil do paciente:', pacienteError);
          }
          
          if (ativo) {
            setUser(session.user);
            setPaciente(paciente || null);
            setSession(session);
            setLoading(false);
          }
        } else {
          // Nenhuma sessão ativa
          if (ativo) {
            setUser(null);
            setPaciente(null);
            setSession(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização da sessão:', error);
        if (ativo) {
          setUser(null);
          setPaciente(null);
          setSession(null);
          setLoading(false);
        }
      }
    }
    
    carregar();
    
    // Listener para mudanças de autenticação (CRÍTICO para persistência)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (!ativo) return;
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setPaciente(null);
          setSession(null);
        } else if (event === 'SIGNED_IN' && session) {
          // Usuário fez login, buscar dados do paciente
          const { data: paciente } = await supabase
            .from('pacientes')
            .select('*')
            .eq('profile_id', session.user.id)
            .single();
            
          setUser(session.user);
          setPaciente(paciente || null);
          setSession(session);
          
          // Redirecionar para chat após login bem-sucedido
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            setTimeout(() => {
              window.location.href = '/chat';
            }, 500);
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token foi renovado, atualizar estado
          setUser(session.user);
          setSession(session);
        }
      }
    );
    
    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []); // SEM dependências para evitar loops

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

  const signUp = async (email: string, password: string, nome: string, telefone: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar conta:', error);
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
      setPaciente(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setUser(null);
      setPaciente(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    paciente,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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
  const [sessionChecked, setSessionChecked] = useState(false);
  const routerRef = useRef<any>(null);

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!ativo) return;
        
        if (data?.session?.user) {
          console.log('✅ Sessão encontrada:', data.session.user.email);
          setUser(data.session.user);
          setSession(data.session);
          
          // Buscar dados do paciente
          const { data: paciente, error: pacienteError } = await supabase
            .from('pacientes')
            .select('*')
            .eq('profile_id', data.session.user.id)
            .maybeSingle();
            
          if (pacienteError && pacienteError.code !== 'PGRST116') {
            console.warn('Erro ao buscar paciente:', pacienteError);
          }
          
          // CRÍTICO: Se não encontrou paciente, NÃO permitir acesso
          // Apenas pacientes cadastrados podem usar o app
          if (!paciente) {
            console.error('🚫 Paciente não encontrado na tabela. Acesso negado.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setPaciente(null);
          } else {
            setPaciente(paciente);
          }
        } else {
          console.log('🚫 Nenhuma sessão ativa.');
          setUser(null);
          setSession(null);
          setPaciente(null);
        }
      } catch (err) {
        console.error('Erro ao carregar sessão:', err);
      } finally {
        if (ativo) {
          setSessionChecked(true);
          setLoading(false);
        }
      }
    }

    verificarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ Login bem-sucedido no App Paciente!');
          
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            
            // Buscar dados do paciente
            try {
              const { data: paciente, error } = await supabase
                .from('pacientes')
                .select('*')
                .eq('profile_id', session.user.id)
                .maybeSingle();
                
              if (error && error.code !== 'PGRST116') {
                console.warn('Erro ao buscar paciente:', error);
              }
              
              // Se não encontrou paciente, criar um automaticamente
              if (!paciente) {
                console.log('🔄 Criando paciente automaticamente para usuário:', session.user.email);
                const { data: novoPaciente, error: createError } = await supabase
                  .from('pacientes')
                  .insert({
                    profile_id: session.user.id,
                    nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Paciente',
                    email: session.user.email,
                    ativo: true,
                    lgpd_autorizado: true,
                    convenio_tipo: 'particular'
                  })
                  .select()
                  .single();
                  
                if (createError) {
                  console.error('Erro ao criar paciente:', createError);
                  setPaciente(null);
                } else {
                  setPaciente(novoPaciente);
                }
              } else {
                setPaciente(paciente);
              }
            } catch (err) {
              console.warn('Erro ao buscar paciente:', err);
              setPaciente(null);
            }
            
            setSessionChecked(true);
            setLoading(false);
            
            // REMOVIDO redirecionamento automático para evitar loop
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuário desconectado.');
          setUser(null);
          setSession(null);
          setPaciente(null);
          setSessionChecked(true);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          setSession(session);
          setSessionChecked(true);
          setLoading(false);
        }
      }
    );

    return () => {
      ativo = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Redirecionamento simplificado - REMOVIDO para evitar loop

  // 🔹 4. Render seguro — não pisca, nem loopa
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px' }}>Carregando...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
      // Não definir setLoading(false) aqui - deixar o listener fazer isso
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

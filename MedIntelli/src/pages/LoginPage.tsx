import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  
  const { signIn, signUp, user, session } = useAuth();

  // Função para fazer redirect forçado após autenticação
  const processAuthenticatedRedirect = (redirectUser = true) => {
    if (isProcessingRedirect) {
      console.log('🚫 Redirect já em processamento, ignorando...');
      return;
    }

    console.log('✅ Processando redirect para usuário autenticado:', redirectUser);
    setIsProcessingRedirect(true);
    
    try {
      if (typeof window !== 'undefined' && redirectUser) {
        // Usar replace para evitar loop no histórico
        window.location.replace('/chat');
      } else {
        navigate('/chat', { replace: true });
      }
    } catch (error) {
      console.error('Erro no redirect:', error);
      // Fallback para navigate se window.location falhar
      navigate('/chat', { replace: true });
    } finally {
      // Resetar flag após 2 segundos
      setTimeout(() => {
        setIsProcessingRedirect(false);
      }, 2000);
    }
  };

  // Verificar sessão existente na montagem do componente
  useEffect(() => {
    let isMounted = true;
    
    const checkExistingSession = async () => {
      if (initialAuthCheck) return; // Evitar múltiplas verificações
      
      console.log('🔍 Verificando sessão existente...');
      setInitialAuthCheck(true);
      
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro ao verificar sessão:', error);
          return;
        }
        
        if (existingSession && existingSession.user && isMounted) {
          console.log('👤 Sessão existente encontrada, redirecionando...');
          // Usuário já está autenticado, fazer redirect
          processAuthenticatedRedirect(true);
        } else {
          console.log('✅ Nenhuma sessão existente encontrada');
        }
      } catch (error) {
        console.error('❌ Erro na verificação de sessão:', error);
      }
    };

    // Aguardar um pequeno delay para garantir que o AuthContext foi inicializado
    const timer = setTimeout(checkExistingSession, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Listener para mudanças de estado de autenticação (usando Supabase auth state)
  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const setupAuthListener = () => {
      // Listener para mudanças de autenticação
      authSubscription = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão');
        
        if (!isMounted || isProcessingRedirect) return;
        
        if (event === 'SIGNED_IN' && session && session.user) {
          console.log('✅ Login bem-sucedido detectado, processando redirect...');
          // Login bem-sucedido, processar redirect
          setTimeout(() => {
            if (isMounted) {
              processAuthenticatedRedirect(true);
            }
          }, 300); // Pequeno delay para garantir que o estado foi atualizado
        }
      });
    };

    setupAuthListener();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.data?.subscription?.unsubscribe();
      }
    };
  }, [isProcessingRedirect]);

  // Verificar se usuário já está autenticado quando user/session mudarem
  useEffect(() => {
    if (user && session && !isProcessingRedirect) {
      console.log('👤 Usuário já autenticado, processando redirect...');
      processAuthenticatedRedirect(false);
    }
  }, [user, session, isProcessingRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos submissions
    if (loading || isProcessingRedirect) {
      console.log('🚫 Submission ignorado: loading ou redirect em progresso');
      return;
    }
    
    setError('');
    setLoading(true);
    setIsProcessingRedirect(false); // Resetar flag de redirect

    try {
      if (isLogin) {
        console.log('🔑 Tentando fazer login...');
        await signIn(email, password);
        console.log('✅ Login bem-sucedido, esperando auth state change...');
        // O redirect será feito pelo listener onAuthStateChange
        
      } else {
        if (!nome || !telefone) {
          setError('Preencha todos os campos');
          setLoading(false);
          return;
        }
        
        console.log('📝 Tentando criar conta...');
        await signUp(email, password, nome, telefone);
        console.log('✅ Conta criada, esperando auth state change...');
        // O redirect será feito pelo listener onAuthStateChange
      }
      
      // Não fazer redirect manual - deixar o listener onAuthStateChange cuidar disso
      // para evitar múltiplos redirects e loops
      
    } catch (err: any) {
      console.error('❌ Erro no login/cadastro:', err);
      setError(err.message || 'Erro ao processar solicitação');
      setLoading(false);
      setIsProcessingRedirect(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo e Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-3">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">MedIntelli</h1>
            <p className="text-gray-600">Portal do Paciente</p>
          </div>

          {/* Card de Login/Registro */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isLogin
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  !isLogin
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Debug info - Remover em produção */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-100 p-2 rounded text-xs text-gray-600">
                  <div>Loading: {loading.toString()}</div>
                  <div>Processing Redirect: {isProcessingRedirect.toString()}</div>
                  <div>User Auth: {user ? 'Sim' : 'Não'}</div>
                  <div>Session: {session ? 'Ativa' : 'Inativa'}</div>
                </div>
              )}
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 00000-0000"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>{isLogin ? 'Entrar' : 'Criar Conta'}</>
                )}
              </button>
            </form>

            {isLogin && (
              <div className="mt-4 text-center">
                <button className="text-sm text-blue-600 hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
            )}
          </div>

          {/* Informação de suporte */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Dúvidas? Entre em contato conosco</p>
            <p className="font-medium text-gray-900 mt-1">contato@medintelli.com.br</p>
          </div>
        </div>
      </div>
    </div>
  );
}

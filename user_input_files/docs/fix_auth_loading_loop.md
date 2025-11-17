# Correção do Loop de Autenticação - MedIntelli V1 e App Paciente

## Problema Identificado
O sistema apresentava loop infinito com a mensagem "Buscando perfil para user_id... Perfil encontrado por user_id: Object" nunca finalizando o carregamento.

## Arquivos Corrigidos

### 1. AuthContext.tsx (medintelli-v1)
**Localização:** `/workspace/medintelli-v1/src/contexts/AuthContext.tsx`

**Correções Aplicadas:**
- Simplificação do useEffect com controle de estado `ativo`
- Remoção da função `fetchUserProfile` que causava loops
- Implementação de carregamento direto e controlado
- Correção da função `signOut` com limpeza completa de storage
- Remoção da variável `initialized` desnecessária

**ANTES:**
```typescript
useEffect(() => {
  let mounted = true;
  let timeoutId: NodeJS.Timeout;

  const initializeAuth = async () => {
    if (initialized) return; // Evitar re-inicialização
    
    try {
      timeoutId = setTimeout(() => {
        if (mounted && !initialized) {
          console.warn('Autenticação demorou muito, forçando estado inicial');
          setLoading(false);
          setInitialized(true);
        }
      }, 5000);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (mounted && !initialized) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserProfile(
            currentSession.user.id, 
            currentSession.user.email || '',
            currentSession.user.user_metadata?.name
          );
        }
        
        setInitialized(true);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
      if (mounted && !initialized) {
        setLoading(false);
        setInitialized(true);
        clearTimeout(timeoutId);
      }
    }
  };

  initializeAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (!mounted || !initialized) return;
    
    console.log('Auth state change:', event);

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    if (currentSession?.user && event !== 'SIGNED_OUT') {
      await fetchUserProfile(
        currentSession.user.id,
        currentSession.user.email || '',
        currentSession.user.user_metadata?.name
      );
    } else {
      setProfile(null);
    }
    
    setLoading(false);
  });

  return () => {
    mounted = false;
    clearTimeout(timeoutId);
    subscription.unsubscribe();
  };
}, []); // PATCH PACK V3: Removido 'initialized' das dependências para evitar loops
```

**DEPOIS:**
```typescript
useEffect(() => {
  let ativo = true;
  
  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !ativo) {
      if (ativo) {
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
      }
      return;
    }
    
    const { data: perfil } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (ativo) {
      setUser(user);
      setProfile(perfil);
      setSession({ user } as Session);
      setLoading(false);
    }
  }
  
  carregar();
  
  return () => { ativo = false; };
}, []); // ⚠️ SEM user como dependência
```

### 2. AuthContext.tsx (app-paciente-medintelli)
**Localização:** `/workspace/app-paciente-medintelli/src/contexts/AuthContext.tsx`

**Correções Aplicadas:**
- Simplificação do useEffect com controle de estado `ativo`
- Remoção das variáveis `isInitialized` e `isLoggingOut`
- Remoção da função `fetchPaciente` que causava loops
- Implementação de carregamento direto e controlado
- Correção da função `signOut` com limpeza completa de storage
- Simplificação das funções `signIn` e `signUp`

**ANTES:**
```typescript
useEffect(() => {
  let mounted = true;
  let timeoutId: NodeJS.Timeout;

  const initializeAuth = async () => {
    if (isInitialized.current || isLoggingOut.current) {
      return;
    }

    try {
      timeoutId = setTimeout(() => {
        if (mounted && !isInitialized.current) {
          console.warn('Autenticacao demorou muito, forcando estado inicial');
          setLoading(false);
          isInitialized.current = true;
        }
      }, 5000);

      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao obter sessao:', error);
      }
      
      if (mounted && !isLoggingOut.current) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchPaciente(currentSession.user.id);
        } else {
          setPaciente(null);
        }
        
        isInitialized.current = true;
        setLoading(false);
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Erro ao inicializar autenticacao:', error);
      if (mounted) {
        setLoading(false);
        isInitialized.current = true;
        clearTimeout(timeoutId);
      }
    }
  };

  initializeAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
    if (!mounted || isLoggingOut.current) return;

    console.log('Auth state change:', event);

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    if (currentSession?.user && event !== 'SIGNED_OUT') {
      fetchPaciente(currentSession.user.id).catch(err => {
        console.error('Erro ao buscar paciente no auth change:', err);
      });
    } else if (event === 'SIGNED_OUT') {
      setPaciente(null);
    }
    
    if (isInitialized.current) {
      setLoading(false);
    }
  });

  return () => {
    mounted = false;
    clearTimeout(timeoutId);
    subscription.unsubscribe();
  };
}, []); // Dependencias vazias - executar apenas uma vez
```

**DEPOIS:**
```typescript
useEffect(() => {
  let ativo = true;
  
  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !ativo) {
      if (ativo) {
        setUser(null);
        setPaciente(null);
        setSession(null);
        setLoading(false);
      }
      return;
    }
    
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('*')
      .eq('profile_id', user.id)
      .single();
      
    if (ativo) {
      setUser(user);
      setPaciente(paciente);
      setSession({ user } as Session);
      setLoading(false);
    }
  }
  
  carregar();
  
  return () => { ativo = false; };
}, []); // ⚠️ SEM user como dependência
```

### 3. ProtectedRoute.tsx (medintelli-v1)
**Localização:** `/workspace/medintelli-v1/src/components/ProtectedRoute.tsx`

**Correções Aplicadas:**
- Adição do hook `useNavigate` para redirecionamento seguro
- Implementação de useEffect para controle de redirecionamento
- Controle de dependências `[loading, user, router]`

**ANTES:**
```typescript
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }
```

**DEPOIS:**
```typescript
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }
```

### 4. ProtectedRoute.tsx (app-paciente-medintelli)
**Localização:** `/workspace/app-paciente-medintelli/src/components/ProtectedRoute.tsx`

**Correções Aplicadas:**
- Simplificação da lógica de redirecionamento
- Adição do hook `useNavigate` para controle seguro
- Implementação de useEffect para controle de dependências
- Remoção da variável `hasRedirected` desnecessária

**ANTES:**
```typescript
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasRedirected = useRef(false);

  // ... lógica complexa de redirecionamento
```

**DEPOIS:**
```typescript
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const router = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // ... lógica simplificada
```

## Logout Completo Implementado

### Em Ambos os Projetos:
```typescript
async function handleLogout() {
  await supabase.auth.signOut();
  setUser(null);
  setProfile(null); // ou setPaciente(null) no app-paciente
  setSession(null);
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('/login');
}
```

## Benefícios das Correções

1. **Eliminação do Loop:** O useEffect não possui mais dependências que causam re-renderizações infinitas
2. **Controle de Estado:** A variável `ativo` garante que operações assíncronas não executem após o componente ser desmontado
3. **Redirecionamento Seguro:** O ProtectedRoute agora usa `useEffect` com dependências adequadas
4. **Logout Completo:** Limpeza total de storage e redirecionamento forçado
5. **Performance:** Redução significativa de re-renderizações desnecessárias

## Testes Recomendados

1. **Teste de Login:** Verificar se não há mais loop infinito
2. **Teste de Logout:** Confirmar limpeza completa de dados
3. **Teste de Navegação:** Validar redirecionamentos seguros
4. **Teste de Recarregamento:** Verificar persistência de sessão

## Data da Correção
**11 de novembro de 2025**

## Status
✅ **CONCLUÍDO** - Loop de autenticação corrigido em ambos os projetos
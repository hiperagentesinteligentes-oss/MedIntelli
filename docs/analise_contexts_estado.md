# Análise de Contextos e Gerenciamento de Estado

## Visão Geral

Esta análise examina os contextos React e sistemas de gerenciamento de estado implementados nos projetos **MedIntelli V1** e **App Paciente MedIntelli**.

## 1. Contextos Identificados

### 1.1 AuthContext.tsx - MedIntelli V1

**Localização:** `/medintelli-v1/src/contexts/AuthContext.tsx`

**Características principais:**
- ✅ Implementação completa com TypeScript
- ✅ Gerenciamento de sessão Supabase
- ✅ Sistema de perfis de usuário
- ✅ Controle de loading com tela de loading personalizada
- ✅ Fallback para perfil temporário em caso de erro
- ✅ Sistema de roles/permissões
- ✅ Timeout de 5 segundos para carregamento de perfil

**Interface AuthContextType:**
```typescript
interface AuthContextType {
  user: User | null;           // Usuário Supabase
  session: Session | null;     // Sessão Supabase
  profile: UserProfile | null; // Perfil do usuário
  loading: boolean;            // Estado de carregamento
  signIn: Function;            // Função de login
  signOut: Function;           // Função de logout
  hasRole: Function;           // Verificação de roles
}
```

**Estados gerenciados:**
- `user`: Usuário autenticado do Supabase
- `session`: Sessão ativa
- `profile`: Perfil completo do usuário (nome, role, etc.)
- `loading`: Controla renderização da tela de carregamento
- `initialized`: Controle de inicialização

### 1.2 AuthContext.tsx - App Paciente

**Localização:** `/app-paciente-medintelli/src/contexts/AuthContext.tsx`

**Características principais:**
- ✅ Implementação com TypeScript
- ✅ Focado em pacientes (não profissionais)
- ✅ Redirecionamento automático baseado em estado
- ✅ Sistema de registro (signUp)
- ✅ Redirecionamento seguro pós-login
- ✅ Gerenciamento de dados do paciente

**Interface AuthContextType:**
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  paciente: Paciente | null;    // Dados específicos do paciente
  loading: boolean;
  signIn: Function;
  signUp: Function;             // Registro de novo paciente
  signOut: Function;
}
```

**Estados gerenciados:**
- `user`: Usuário autenticado
- `session`: Sessão ativa
- `paciente`: Dados específicos do paciente
- `loading`: Estado de carregamento
- `sessionChecked`: Controle de verificação inicial

## 2. Sistema de Perfis e Permissões

### 2.1 Roles Definidos (MedIntelli V1)

```typescript
export type UserRole = 
  | 'super_admin'     // Super Administrador
  | 'administrador'   // Administrador
  | 'secretaria'      // Secretaria
  | 'medico'          // Médico
  | 'auxiliar';       // Auxiliar
```

### 2.2 Estrutura UserProfile

```typescript
interface UserProfile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string;
  user_id?: string;
  clinica_id?: string;
  created_at?: string;
  updated_at?: string;
}
```

### 2.3 Trigger Automático de Perfil

**Migração:** `1762779107_create_profile_trigger_for_new_users.sql`

- ✅ Trigger automático ao criar usuário
- ✅ Inserção automática na tabela `profiles`
- ✅ Setrole padrão: 'paciente'
- ✅ Nome baseado em metadata do usuário

## 3. Tipos de Dados Implementados

### 3.1 MedIntelli V1 - Tipos Principais

```typescript
// Paciente do sistema (profissionais da saúde)
export interface Paciente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  plano_saude?: string;
  convenio?: string;  // UNIMED, UNIMED UNIFACIL, CASSI, CABESP
  ativo?: boolean;
  created_at?: string;
}

// Agendamento
export interface Agendamento {
  id: string;
  paciente_id?: string;
  paciente_nome?: string;
  medico_id?: string;
  data_agendamento: string;
  status: 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'atrasado';
  // ... outros campos
}

// Fila de Espera
export interface FilaEspera {
  id: string;
  nome_paciente: string;
  telefone: string;
  status: 'aguardando' | 'atendido' | 'removido';
  score_prioridade?: number;
  // ... outros campos
}
```

### 3.2 App Paciente - Tipos Principais

```typescript
// Paciente (usuários finais)
export interface Paciente {
  id: string;
  profile_id?: string;        // ID do profile no auth
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  plano_saude?: string;
  numero_carteirinha?: string;
  ativo: boolean;
  // ... outros campos
}

// Conversa com IA
export interface ConversaIA {
  id: string;
  paciente_id: string;
  mensagem: string;
  resposta: string;
  intencao_classificada?: 'agendamento' | 'informacao' | 'exame' | 'emergencia' | 'outro';
}

// Mensagem do App
export interface MensagemApp {
  id: string;
  titulo: string;
  conteudo: string;
  urgencia: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'respondida' | 'encaminhada';
}
```

## 4. Hooks Customizados

### 4.1 useFeriados (App Paciente)

**Localização:** `/app-paciente-medintelli/src/hooks/useFeriados.ts`

**Funcionalidades:**
- ✅ Carregamento de feriados (específicos e recorrentes)
- ✅ Verificação se uma data é feriado
- ✅ Obtenção de feriados por mês
- ✅ Performance otimizada com Promise.all
- ✅ Timeout e error handling

**Interface:**
```typescript
function useFeriados(
  periodoInicial: Date = new Date(), 
  mesesAhead: number = 2
): {
  feriados: Feriado[];
  loading: boolean;
  error: string | null;
  carregarFeriados: Function;
  verificarSeEHoleriado: Function;
  obterFeriadosDoMes: Function;
}
```

## 5. Gerenciamento de Dados Globais

### 5.1 Estado Atual

**Contextos únicos identificados:**
- ✅ AuthContext (duas implementações, uma para cada projeto)

**Ausência de gerenciamento centralizado:**
- ❌ Não há estado global para dados de agendamentos
- ❌ Não há cache de feriados no contexto global
- ❌ Não há gerenciamento de notificações global
- ❌ Não há store centralizado (Redux, Zustand, etc.)

### 5.2 Padrão de Gerenciamento

**Atual:** Context API para autenticação + hooks locais para dados específicos
**Recomendado:** Expandir para mais contextos ou adotar store global

## 6. Sistema de Permissões (RLS)

### 6.1 Row Level Security Implementado

**Migração:** `1762746463_setup_rls_policies_medintelli.sql`

**Tabelas com RLS habilitado:**
- ✅ user_profiles
- ✅ pacientes
- ✅ agendamentos
- ✅ fila_espera
- ✅ feriados
- ✅ whatsapp_messages
- ✅ whatsapp_templates
- ✅ whatsapp_config
- ✅ knowledge_store

**Características das políticas:**
- Políticas simples (acedem a todos os usuários autenticados)
- Não há granularidade por tenant/multitenancy
- Política específica para feriados (baseada em created_by_user_id)

## 7. Conexão com Supabase

### 7.1 Configuração

**Importações comuns:**
```typescript
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
```

### 7.2 Estados de Autenticação Monitorados

- `SIGNED_IN`: Login bem-sucedido
- `SIGNED_OUT`: Logout
- `TOKEN_REFRESHED`: Renovação de token

## 8. Boas Práticas Identificadas

### 8.1 Pontos Positivos ✅

1. **TypeScript em todos os contextos**
2. **Interface bem definidas para tipos de contexto**
3. **Loading states com telas personalizadas**
4. **Error handling com fallbacks**
5. **Verificação de sessão inicial robusta**
6. **Cleanup de listeners (useEffect return)**
7. **Performance com Promise.all quando aplicável**
8. **Timeout para operações que podem travar**

### 8.2 Pontos de Atenção ⚠️

1. **Não há store global para dados compartilhados**
2. **Redirecionamento com window.location (pode ser melhorado com React Router)**
3. **RLS policies muito permissivas (usar autenticação simples)**
4. **Ausência de cache para dados frequentes**
5. **Não há gerenciamento de estado offline**

## 9. Recomendações

### 9.1 Melhorias de Curto Prazo

1. **Implementar contexto para agendamentos**
   ```typescript
   interface AgendamentoContextType {
     agendamentos: Agendamento[];
     loading: boolean;
     criarAgendamento: Function;
     atualizarAgendamento: Function;
   }
   ```

2. **Adicionar contexto de notificações**
   ```typescript
   interface NotificacaoContextType {
     notificacoes: Notificacao[];
     naoLidas: number;
     marcarComoLida: Function;
   }
   ```

3. **Implementar cache com React Query ou SWR**
   - Para dados de feriados
   - Para configurações
   - Para dados de pacientes

### 9.2 Melhorias de Longo Prazo

1. **Adotar Zustand ou Redux Toolkit** para gerenciamento global
2. **Implementar multitenancy nas RLS policies**
3. **Adicionar persistência local (localStorage) para contexto Auth**
4. **Implementar real-time subscriptions com Supabase**
5. **Adicionar gerenciamento de estado offline**

## 10. Conclusão

### Estado Atual: **BOM**

O projeto possui uma base sólida de gerenciamento de estado focado na autenticação, com:

- ✅ Contextos bem estruturados e tipados
- ✅ Sistema de perfis e roles implementado
- ✅ Integração robusta com Supabase
- ✅ Boas práticas de React implementadas

### Gap Principal: **Falta de gerenciamento global para dados de negócio**

O sistema atualmente gerencia bem a autenticação, mas falta um gerenciamento centralizado para:
- Dados de agendamentos
- Notificações
- Configurações
- Cache de dados frequentes

### Próximos Passos Sugeridos:

1. Implementar contexto para agendamentos
2. Adicionar contexto para notificações
3. Considerar adoção de store global (Zustand recomendado por simplicidade)
4. Melhorar RLS policies com granularidade adequada
5. Implementar cache e otimizações de performance

# Análise da Integração com Supabase - Sistema MedIntelli

## 1. Configuração do Supabase Client

### 1.1 Projetos Frontend Integrados

O sistema possui dois projetos frontend que se conectam ao mesmo instance do Supabase:

#### **MedIntelli V1** (`/medintelli-v1/`)
```typescript
// /medintelli-v1/src/lib/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ufxdewolfdpgrxdkvnbr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '[CHAVE_ANON]';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

#### **App Paciente** (`/app-paciente-medintelli/`)
```typescript
// /app-paciente-medintelli/src/lib/supabase.ts
const SUPABASE_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co';
const SUPABASE_ANON_KEY = '[CHAVE_ANON]';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### 1.2 URL Base das Edge Functions
- **URL Base**: `https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1`
- **Instance ID**: `ufxdewolfdpgrxdkvnbr`

---

## 2. Estrutura do Banco de Dados

### 2.1 Tabelas Principais

#### **Tabela: `pacientes`**
```sql
CREATE TABLE pacientes (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    data_nascimento date,
    email text,
    telefone text,
    telefone_alt text,
    convenio text,
    endereco text,
    contato_nome text,
    created_at timestamptz default now()
);
```

#### **Tabela: `agendamentos`**
```sql
CREATE TABLE agendamentos (
    id uuid primary key default gen_random_uuid(),
    paciente_id uuid references pacientes(id),
    inicio timestamptz not null,
    fim timestamptz not null,
    status text not null check (status in ('pendente','confirmado','cancelado','atrasado','em_atendimento')),
    origem text not null check (origem in ('app','manual','whatsapp','ia')),
    observacoes text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
```

#### **Tabela: `fila_espera`**
```sql
CREATE TABLE fila_espera (
    id uuid primary key default gen_random_uuid(),
    paciente_id uuid references pacientes(id),
    motivo text,
    prioridade text check (prioridade in ('baixa','media','alta','urgente')) default 'media',
    status text check (status in ('ativo','atendido','removido')) default 'ativo',
    pos INTEGER, -- Para reorder via DnD
    agendamento_id UUID REFERENCES agendamentos(id), -- Link para agendamento convertido
    created_at timestamptz default now()
);
```

#### **Tabela: `user_profiles`**
```sql
CREATE TABLE user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    perfil text not null check (perfil in ('SUPERADMIN','ADMIN','Medico','Secretaria','Auxiliar')),
    created_at timestamptz default now()
);
```

#### **Tabela: `feriados`**
```sql
-- Estrutura expandida com recorrência e melhor organização
CREATE TABLE feriados (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    data date, -- Para feriados pontuais
    dia_mes integer, -- Para feriados recorrentes (dia)
    mes integer, -- Para feriados recorrentes (mês)
    recorrente boolean default false,
    created_by_user_id uuid references auth.users(id),
    created_at timestamptz default now()
);
```

### 2.2 Tabelas de Integração WhatsApp

#### **Tabela: `whatsapp_config`**
```sql
CREATE TABLE whatsapp_config (
    id uuid primary key default gen_random_uuid(),
    chave text unique not null,
    valor text not null,
    descricao text,
    updated_at timestamptz default now()
);
```

#### **Tabela: `whatsapp_templates`**
```sql
CREATE TABLE whatsapp_templates (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    categoria text not null,
    tipo text not null,
    conteudo_template text not null,
    variaveis jsonb,
    ativo boolean default true,
    created_at timestamptz default now()
);
```

#### **Tabela: `whatsapp_messages`**
```sql
-- Armazenamento de mensagens do WhatsApp
-- Estrutura não detalhada no arquivo fornecido
```

### 2.3 Tabelas de Conhecimento IA

#### **Tabela: `knowledge_store`**
```sql
-- Tabela para armazenar base de conhecimento da IA
-- Permite versãoamento e ativação/desativação de conteúdo
```

### 2.4 Índices de Performance

O sistema possui índices otimizados para melhor performance:

```sql
-- Índices para Fila de Espera
CREATE INDEX idx_fila_espera_pos ON fila_espera(pos) WHERE pos IS NOT NULL;
CREATE INDEX idx_fila_espera_created ON fila_espera(created_at DESC);
CREATE INDEX idx_fila_espera_status ON fila_espera(status);

-- Índices para Agendamentos
CREATE INDEX idx_agendamentos_inicio ON agendamentos(data_agendamento);
CREATE INDEX idx_agendamentos_paciente_data ON agendamentos(paciente_id, data_agendamento);
```

---

## 3. Edge Functions Existentes

### 3.1 Funções de Gestão de Usuários

#### **`create-admin-user`**
- **Finalidade**: Criação de usuários administradores
- **Linguagem**: TypeScript
- **Funcionalidade**: CRUD de usuários admin

#### **`auto-create-profile`**
- **Finalidade**: Criação automática de perfis de usuário
- **Trigger**: Associada à criação de usuários no Auth

#### **`manage-user`**
- **Finalidade**: Gestão completa de usuários
- **Funcionalidade**: CRUD com RLS (Row Level Security)

#### **`seed-users`**
- **Finalidade**: Popular tabela de usuários com dados iniciais
- **Uso**: Inicialização do sistema

### 3.2 Funções de Gestão Médica

#### **`pacientes-manager`**
- **Finalidade**: CRUD de pacientes
- **Funcionalidades**:
  - Busca com filtros (nome, telefone, email)
  - Filtro por status ativo/inativo
  - Validação RLS
- **URL**: `/functions/v1/pacientes-manager`

#### **`agendamentos`**
- **Finalidade**: Gestão completa de agendamentos
- **Funcionalidades**:
  - CRUD com validação RLS
  - Verificação de conflitos
  - Inserção com status 'pendente'
  - Filtros por status (pendente, confirmado)
  - Auditoria de logs
- **URL**: `/functions/v1/agendamentos`

### 3.3 Funções de Fila de Espera

#### **`fila-espera`**
- **Finalidade**: Gestão da fila de espera com DnD
- **Funcionalidades**:
  - CRUD de itens da fila
  - Suporte a reorder via drag-and-drop
  - Priorização (baixa, media, alta, urgente)
  - Conversão para agendamento

### 3.4 Funções de Feriados

#### **`feriados-sync`**
- **Finalidade**: Sincronização de feriados nacionais
- **Funcionalidades**:
  - Busca automática de feriados
  - Armazenamento recorrente/pontual
  - Integração com cálculo de horários livres

### 3.5 Funções de IA e Automação

#### **`ai-agente`**
- **Finalidade**: Agente de IA para conversas com pacientes
- **Integração**: OpenAI API
- **Funcionalidades**:
  - Processamento de mensagens
  - Consulta à base de conhecimento
  - Contexto específico por paciente
  - Geração de respostas inteligentes

#### **`agent-ia`**
- **Finalidade**: Agente de IA secundário
- **Linguagem**: TypeScript

#### **`mensagens`**
- **Finalidade**: Gestão de mensagens do sistema
- **Funcionalidade**: CRUD e automação

#### **`buc-manager`**
- **Finalidade**: Gestão de Business Unit Control (BUC)
- **Funcionalidade**: Controle de versões e configurações

### 3.6 Funções de WhatsApp

#### **`whatsapp-webhook-receiver`**
- **Finalidade**: Receber webhooks do WhatsApp Business
- **Funcionalidades**:
  - Validação de assinatura (webhook secret)
  - Whitelist de números autorizados
  - Processamento de mensagens recebidas
  - Integração com sistema de filas

#### **`whatsapp-send-message`**
- **Finalidade**: Enviar mensagens via WhatsApp
- **Funcionalidades**:
  - Envio programático de mensagens
  - Templates personalizados
  - Variáveis dinâmicas

#### **`whatsapp-scheduler`**
- **Finalidade**: Agendamento de mensagens WhatsApp
- **Trigger**: Cron job (09:00 e 15:00 diariamente)
- **Funcionalidades**:
  - Mensagens programadas
  - Lembrete automático
  - Follow-up de pacientes

### 3.7 Funções de Painel

#### **`painel-paciente`**
- **Finalidade**: Interface específica para pacientes
- **Funcionalidade**: CRUD específico para pacientes

---

## 4. Cron Jobs Configurados

### 4.1 Cron Jobs Ativos (Total: 18)

| ID | Nome | Cron Expression | Função | Frequência |
|----|------|----------------|--------|------------|
| 1 | whatsapp-status-keeper | `*/5 * * * *` | whatsapp-status-keeper | A cada 5 min |
| 2 | cron-notification-processor | `*/15 * * * *` | cron-notification-processor | A cada 15 min |
| 3 | sistema-followup-cron | `0 10 * * *` | sistema-followup-cron | Diariamente 10h |
| 4 | sistema-import-export-cron | `0 2 * * *` | sistema-import-export-cron | Diariamente 2h |
| 6 | send-confirmation-reminder | `0 9 * * *` | send-confirmation-reminder | Diariamente 9h |
| 7 | process-waiting-list-timeouts | `*/15 * * * *` | process-waiting-list-timeouts | A cada 15 min |
| 11 | whatsapp-message-auto-processor-cron | `* * * * *` | whatsapp-message-auto-processor-cron | A cada minuto |
| 12 | run-automations | `0 * * * *` | run-automations | De hora em hora |
| 13 | alerts-monitor | `*/2 * * * *` | alerts-monitor | A cada 2 min |
| 14 | metrics-collector | `*/5 * * * *` | metrics-collector | A cada 5 min |
| 15 | escalation-handler-cron | `*/3 * * * *` | escalation-handler-cron | A cada 3 min |
| 16 | create-automatic-backup | `0 */6 * * *` | create-automatic-backup | De 6 em 6h |
| 20 | processar-lembretes | `0 * * * *` | processar-lembretes | De hora em hora |
| 21 | ia-instrucoes-processor-cron | `*/10 * * * *` | ia-instrucoes-processor-cron | A cada 10 min |
| 22 | context-learning-cron | `0 */6 * * *` | context-learning-cron | De 6 em 6h |
| 23 | processar-whatsapp-cron-corrigido | `*/5 * * * *` | processar-whatsapp-cron-corrigido | A cada 5 min |
| 24 | whatsapp-scheduler | `0 9,15 * * *` | whatsapp-scheduler | 9h e 15h |

### 4.2 Categorização dos Cron Jobs

#### **Monitoramento e Alertas**
- `whatsapp-status-keeper` (5 min)
- `alerts-monitor` (2 min)
- `metrics-collector` (5 min)

#### **Processamento de Mensagens**
- `whatsapp-message-auto-processor-cron` (1 min)
- `processar-whatsapp-cron-corrigido` (5 min)

#### **IA e Machine Learning**
- `ia-instrucoes-processor-cron` (10 min)
- `context-learning-cron` (6h)

#### **Agendamento e Lembrete**
- `whatsapp-scheduler` (9h e 15h)
- `processar-lembretes` (hora em hora)
- `send-confirmation-reminder` (9h)

#### **Fila de Espera**
- `process-waiting-list-timeouts` (15 min)

#### **Automação**
- `run-automations` (hora em hora)
- `escalation-handler-cron` (3 min)

#### **Manutenção**
- `create-automatic-backup` (6h)
- `sistema-import-export-cron` (2h)

---

## 5. Row Level Security (RLS)

### 5.1 Tabelas com RLS Habilitado

```sql
-- Todas as tabelas de domínio possuem RLS habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_store ENABLE ROW LEVEL SECURITY;
```

### 5.2 Políticas de Segurança

#### **Pacientes**
```sql
CREATE POLICY p_select_all_authenticated ON pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY p_ins_upd_pacientes ON pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

#### **Agendamentos**
```sql
CREATE POLICY p_ag_select ON agendamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY p_ag_insert ON agendamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_ag_update ON agendamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

#### **Fila de Espera**
```sql
CREATE POLICY p_fila_select ON fila_espera FOR SELECT TO authenticated USING (true);
CREATE POLICY p_fila_write ON fila_espera FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_fila_update ON fila_espera FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

#### **Feriados**
```sql
CREATE POLICY feriados_read ON feriados FOR SELECT TO authenticated USING (true);
CREATE POLICY feriados_insert ON feriados FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by_user_id);
CREATE POLICY feriados_update ON feriados FOR UPDATE TO authenticated USING (auth.uid() = created_by_user_id) WITH CHECK (auth.uid() = created_by_user_id);
```

#### **Configurações WhatsApp**
```sql
CREATE POLICY whatsapp_config_read ON whatsapp_config FOR SELECT TO authenticated USING (true);
CREATE POLICY whatsapp_config_write ON whatsapp_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 6. Migrations e Evolução do Schema

### 6.1 Timeline de Migrations (2024-2025)

#### **Fase Inicial (Dezembro 2024)**
- `1731326615_rls_feriados_policies.sql`: Políticas RLS para feriados

#### **Jan/Fev 2025**
- `1762746463_setup_rls_policies_medintelli.sql`: Configuração completa RLS
- `1762746470_agenda_contagem_por_dia_function.sql`: Funções de contagem
- `1762749778_criar_usuario_teste_app_paciente.sql`: Usuário teste

#### **Performance (Fev 2025)**
- `1762774241_add_performance_indexes.sql`: Índices de performance
- `1762776923_create_base_conhecimento_table.sql`: Conhecimento IA (v1)
- `1762776934_create_base_conhecimento_table_v2.sql`: Conhecimento IA (v2)
- `1762776960_create_buc_versoes_table.sql`: Controle de versões BUC
- `1762779107_create_profile_trigger_for_new_users.sql`: Trigger automático

#### **Patch Pack V2 (Fev 2025)**
- `1762782246_patch_pack_v2_schema_indices_rpcs.sql`: Schema + índices
- `1762782273_patch_pack_v2_schema_indices_rpcs_fixed.sql`: Correções V2
- `1762782324_patch_pack_v2_schema_indices_rpcs_v2.sql`: V2 final

#### **Patch Pack V3 (Mar 2025)**
- `1762797289_medintelli_v2_pacientes_schema.sql`: Schema V2
- `1762797290_patch_pack_v3_complete.sql`: Pack completo V3
- `1762801589_patch_pack_v3_complete.sql`: V3 corrigido
- `1762801614_patch_pack_v3_complete_fixed.sql`: V3 fix
- `1762801621_patch_v3_part1_fila_espera.sql`: Fila de espera
- `1762801626_patch_v3_part2_agendamentos.sql`: Agendamentos
- `1762801634_patch_v3_part3_feriados.sql`: Feriados
- `1762801656_patch_v3_part3_feriados_fixed.sql`: Feriados fix
- `1762801668_patch_v3_part4_horarios_livres.sql`: Horários livres
- `1762801683_patch_v3_part5_feriados_sem_triggers.sql`: Sem triggers

#### **Contexto IA (Mar 2025)**
- `1762804183_create_ia_contextos_table.sql`: Contexto IA (v1)
- `1762804193_create_ia_contextos_table.sql`: Contexto IA (v2)
- `1762804202_create_ia_contextos_table.sql`: Contexto IA (v3)
- `1762804207_create_ia_contextos_table.sql`: Contexto IA (v4)
- `1762804212_add_ia_contextos_indexes.sql`: Índices (v1)
- `1762804217_add_ia_contextos_indexes.sql`: Índices (v2)
- `1762804229_add_ia_contextos_indexes.sql`: Índices (v3)
- `1762804232_add_ia_contextos_index_only.sql`: Índices apenas

---

## 7. Integrações Externas

### 7.1 WhatsApp Business API
- **Webhook Receiver**: `/functions/v1/whatsapp-webhook-receiver`
- **Envio**: `/functions/v1/whatsapp-send-message`
- **Agendamento**: `/functions/v1/whatsapp-scheduler`
- **Template Support**: WhatsApp templates com variáveis dinâmicas

### 7.2 OpenAI API
- **Edge Function**: `ai-agente`
- **Integração**: Para geração de respostas inteligentes
- **Contexto**: Base de conhecimento específica do domínio médico

### 7.3 Variáveis de Ambiente Necessárias
```bash
SUPABASE_URL=https://ufxdewolfdpgrxdkvnbr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
OPENAI_API_KEY=[openai_key]
WHATSAPP_WEBHOOK_SECRET=[webhook_secret]
VITE_SUPABASE_URL=[url_for_frontend]
VITE_SUPABASE_ANON_KEY=[anon_key_for_frontend]
```

---

## 8. Observações e Recomendações

### 8.1 Pontos Fortes
✅ **Arquitetura Modular**: Edge functions bem organizadas por domínio
✅ **Segurança RLS**: Row Level Security em todas as tabelas sensíveis
✅ **Performance**: Índices otimizados para queries frequentes
✅ **Automação**: 18 cron jobs para automação completa
✅ **Auditoria**: Logs estruturados em todas as edge functions
✅ **Integração WhatsApp**: Webhook receiver configurado
✅ **IA Integrada**: Agente de IA com base de conhecimento

### 8.2 Áreas de Atenção
⚠️ **Múltiplas Migrations**: 31 migrations podem indicar instabilidade do schema
⚠️ **Cron Jobs**: 18 jobs rodando simultaneamente podem impactar performance
⚠️ **Whitelist WhatsApp**: Números hardcoded na edge function
⚠️ **Secrets**: Credenciais expostas nos arquivos de configuração

### 8.3 Recomendações de Melhoria
🔧 **Consolidar Migrations**: Agrupar migrations similares em uma única
🔧 **Externalizar Config**: Mover URLs e chaves para variáveis de ambiente
🔧 **Caching**: Implementar cache para queries frequentes
🔧 **Monitoring**: Adicionar métricas de performance das edge functions
🔧 **Backup Strategy**: Formalizar estratégia de backup automático
🔧 **Documentation**: Documentar cada edge function com examples de uso

---

## 9. URLs de Produção

### 9.1 Supabase Instance
- **URL**: `https://ufxdewolfdpgrxdkvnbr.supabase.co`
- **Region**: Especificado na configuração
- **Status**: Ativo e operacional

### 9.2 Edge Functions Base URL
- **URL**: `https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1`
- **Authentication**: Bearer token (Supabase JWT)

### 9.3 Frontend Applications
- **MedIntelli V1**: Deploy em ambiente de produção
- **App Paciente**: Deploy em ambiente de produção

---

*Documento gerado em: 2025-11-12 02:35:51*
*Análise realizada por: Sistema de Análise Automatizada*
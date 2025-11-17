# RESTORE_SISTEMA_PRINCIPAL_MEDINTELLI.md
**Versão:** 1.0  
**Data:** 11/11/2025  
**Objetivo:** Restaurar integralmente as **funções do Sistema Principal MedIntelli Basic IA** (mantendo o login já corrigido), garantindo operação ponta‑a‑ponta com **Supabase, Edge Functions, OpenAI** e **WhatsApp (Avisa API)**, sem mocks e com base de conhecimento unificada.

---

## 0) ESCOPO E PRINCÍPIOS
1. **Não alterar** o fluxo de login já corrigido (AuthContext estável, sem loops).  
2. Restaurar e garantir o funcionamento das **8 áreas** do Sistema Principal:  
   - Usuários & Perfis  
   - Pacientes (CRUD + busca)  
   - Agenda (mês/semana/dia, CRUD e reagendamento)  
   - Lista de Espera (inclusão, DnD, agendar a partir da fila)  
   - Feriados (sync nacional + municipais, recorrência, CRUD)  
   - Painel de Mensagens (App Paciente & WhatsApp)  
   - Dashboard (cards clicáveis + métricas)  
   - Agente de IA (OpenAI, base unificada, ações)  
3. **Integração WhatsApp via Avisa API**: usar **apenas o número de teste** durante validação: **+55 16 98870‑7777**.  
4. **Sem dados fictícios/mocks**. Toda gravação deve persistir no Supabase.  
5. Consolidar **Base de Conhecimento** em **`/knowledge/base_conhecimento.txt`** (único arquivo).

---

## 1) VARIÁVEIS DE AMBIENTE (.env)
```env
# Supabase
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini # ou gpt-4-turbo, conforme plano

# Avisa API (WhatsApp)
AVISA_API_URL=https://api.avisa.com.br
AVISA_API_KEY=
WHATSAPP_WEBHOOK_SECRET= # se aplicável

# App
BASE_KNOWLEDGE_PATH=./knowledge/base_conhecimento.txt
TZ=America/Sao_Paulo
```

---

## 2) ESQUEMA DE BANCO (SUPABASE)
> Executar via migrations ou SQL editor. Evitar duplicidades usando `if not exists`.

### 2.1 Usuários / Perfis
```sql
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  perfil text not null check (perfil in ('SuperAdmin','Admin','Auxiliar','Secretaria','Medico')),
  ativo boolean default true,
  created_at timestamp default now()
);
```

### 2.2 Pacientes
```sql
create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  endereco text,
  contato_nome text,
  contato_telefone text,
  data_nascimento date,
  convenio text check (convenio in ('UNIMED','UNIMED UNIFÁCIL','CASSI','CABESP','PARTICULAR')),
  ativo boolean default true,
  created_at timestamp default now()
);
create index if not exists idx_pacientes_nome on pacientes using gin (to_tsvector('portuguese', coalesce(nome,'')));
```

### 2.3 Tipos de Consulta
```sql
create table if not exists tipos_consulta (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null
);
insert into tipos_consulta (nome) values
('Primeira consulta'), ('Retorno'), ('Urgente'), ('Telemedicina')
on conflict (nome) do nothing;
```

### 2.4 Agendamentos
```sql
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado')),
  origem text default 'sistema' check (origem in ('sistema','app','whatsapp')),
  tipo_consulta_id uuid references tipos_consulta(id),
  observacoes text,
  created_at timestamp default now()
);
create index if not exists idx_agend_inicio on agendamentos(inicio);
create index if not exists idx_agend_status on agendamentos(status);
create index if not exists idx_agend_paciente on agendamentos(paciente_id);
```

### 2.5 Lista de Espera
```sql
create table if not exists fila_espera (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete cascade,
  motivo text,
  prioridade int default 0, -- 0-baixa,1-média,2-alta,3-urgente
  pos int,
  created_at timestamp default now()
);
create index if not exists idx_fila_pos on fila_espera(pos);
create index if not exists idx_fila_created on fila_espera(created_at);
```

### 2.6 Feriados
```sql
create table if not exists feriados (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  recorrente boolean default false,
  mes int,
  dia_mes int,
  uf text,
  municipio text,
  created_at timestamp default now()
);
update feriados set mes = extract(month from data), dia_mes=extract(day from data) where mes is null or dia_mes is null;
```

### 2.7 Mensagens (App & WhatsApp)
```sql
create table if not exists app_messages (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete set null,
  conteudo text not null,
  lida boolean default false,
  origem text default 'app',
  created_at timestamp default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete set null,
  categoria text not null, -- 'agenda','paciente','financeiro','saude','marketing'
  tipo text not null,      -- ex: 'confirmacao_agendamento','boas_vindas'
  conteudo text not null,
  template_id text,
  destinatario_telefone text not null,
  status_envio text default 'pendente', -- 'pendente','enviado','entregue','lido','falhou'
  mensagem_origem text default 'sistema', -- 'sistema','manual','automatica'
  data_agendamento timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create view if not exists vw_unread_app as
select paciente_id, count(*)::int as nao_lidas
from app_messages
where coalesce(lida,false) = false
group by paciente_id;

create view if not exists vw_unread_whats as
select paciente_id, count(*)::int as nao_lidas
from whatsapp_messages
where coalesce(status_envio,'pendente') in ('enviado','entregue') and coalesce(lida,false)=false
group by paciente_id;
```

### 2.8 Contexto da IA
```sql
create table if not exists ia_contextos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete cascade,
  origem text check (origem in ('app','whatsapp')),
  contexto jsonb,
  atualizado_em timestamp default now()
);
```

> **RLS**: se RLS estiver ativado, as **Edge Functions** devem usar `SERVICE_ROLE`. Caso contrário, criar **policies** permissivas para os fluxos esperados.

---

## 3) EDGE FUNCTIONS (Deno) — ENDPOINTS E CONTRATOS

### 3.1 `agendamentos` — GET/POST/PUT/PATCH/DELETE
- **GET**: por faixa de data (`start`, `end` ISO) e `scope` (`day|week|month`); retorna `status in ('pendente','confirmado')`.
- **POST**: cria agendamento; aceita `paciente_id` **ou** `paciente_novo{nome,telefone,email,convenio}` (cadastro rápido). Verifica conflito de horário.
- **PATCH**: reagendamento (alterar `inicio` e `fim`).  
- **DELETE**: cancela (`status='cancelado'`).

**Notas críticas:**
- Sempre comparar overlap: `inicio < novo_fim AND fim > novo_inicio` para bloquear duplicidade.
- Origem: `sistema`, `app` ou `whatsapp` (log).

### 3.2 `fila-espera` — GET/POST/PATCH
- **GET**: retorna itens com `paciente{}` e `agendamento{}`; ordena por `pos asc`, `created_at asc`.
- **POST**: inclui paciente **existente** ou `paciente_novo` (cadastro rápido), cria item e **opcionalmente** cria agendamento “pendente” vinculado.
- **PATCH**: recebe `ordenacao: [{id, pos}]` para persistir DnD.

### 3.3 `feriados-sync` — POST/PUT/DELETE
- **POST**: sincroniza nacionais (upsert) calculando `mes`/`dia_mes`.  
- **PUT**: edita feriado (`data`,`titulo`,`recorrente`, `uf`,`municipio`) e atualiza `mes`/`dia_mes`.  
- **DELETE**: exclui por `id` (querystring).

### 3.4 `agent-ia` — POST
- Entrada: `{ origem: 'app'|'whatsapp', paciente_id, mensagem }`  
- Passos:  
  1) lê `ia_contextos` recente,  
  2) compõe prompt (base + contexto + mensagem),  
  3) chama OpenAI (`OPENAI_MODEL`),  
  4) retorna `{ resposta, acao?, dados? }`,  
  5) atualiza `ia_contextos`.  
- Se `acao='agendar'`, chama `agendamentos` (POST) com dados coletados.

### 3.5 WhatsApp
- `whatsapp-send-message` — POST: envia via AVISA API; **durante testes, whitelista** apenas **+55 16 98870‑7777**.  
- `whatsapp-webhook-receiver` — POST: recebe eventos; grava em `whatsapp_messages`.  
- `whatsapp-scheduler` — (opcional) agenda lembretes.

---

## 4) ROTAS `/api` (Next.js) — PROXIES
Criar/confirmar proxies para as Edge Functions (evita CORS e centraliza auth). Exemplos:  
- `/api/agendamentos` → `functions/v1/agendamentos` (encaminha GET/POST/PATCH/DELETE)  
- `/api/fila-espera` → `functions/v1/fila-espera`  
- `/api/feriados` → `functions/v1/feriados-sync`  
- `/api/agent-ia` → `functions/v1/agent-ia`  
- `/api/whatsapp-send-message` → `functions/v1/whatsapp-send-message`  
- `/api/whatsapp-webhook` → `functions/v1/whatsapp-webhook-receiver`

---

## 5) FRONT — SISTEMA PRINCIPAL (RESTORE)

### 5.1 Usuários & Perfis
- Tela `/usuarios`: listar, buscar, **criar**, **editar**, **ativar/inativar**.  
- Correções antigas: botões “Salvar” e “Alterar” devem acionar `/api/usuarios` (ou supabase diretamente) e oferecer `toast` de sucesso/erro.

### 5.2 Pacientes
- Tela `/pacientes`: lista + busca (nome/telefone) + **CRUD**.  
- Select de convênios com valores: `UNIMED`, `UNIMED UNIFÁCIL`, `CASSI`, `CABESP`, `PARTICULAR`.  
- **Cadastro rápido** embutido nos modais de Agendamento e Fila de Espera.

### 5.3 Agenda
- Tela `/agenda`: tabs **Dia / Semana / Mês** + **input date** para navegar.  
- Após cada operação (criar/cancelar/alterar), chamar `loadAgenda()`.  
- Exibir feriados (recorrente: por `mes/dia_mes`; não recorrente: por `data`).  
- **Bloquear** slots ocupados no App (não ofertar).  
- **Editar** agendamento ao clicar no item (mudar data/hora).

### 5.4 Lista de Espera
- Tela `/fila-espera`: listar com **arrastar & soltar** (HTML5 DnD).  
- `PATCH` com `ordenacao` para persistir.  
- Botão **AGENDAR** sugere 3 slots livres → ao confirmar, cria agendamento e remove da fila.  
- Botão **REMOVER** exclui item.  
- Form “Adicionar” permite paciente existente ou **novo** (cadastro rápido).

### 5.5 Feriados
- Tela `/feriados`: lista; **Sincronizar Automático** (POST); **Criar/Editar/Excluir** (PUT/DELETE).  
- Checkbox “**Recorrente (todos os anos)**” atualiza `recorrente=true` e `mes/dia_mes`.

### 5.6 Painel de Mensagens
- Tela `/mensagens`: **duas abas** — **App Paciente** e **WhatsApp**.  
- Badge com **não lidas** (views `vw_unread_app` e `vw_unread_whats`).  
- Render obrigatoriamente **paciente.nome** nas mensagens App Paciente.  
- **Encaminhar** para médico (default **Dr. Francisco**). Ao finalizar, mover para histórico.

### 5.7 Dashboard
- Cards **clicáveis**:  
  - **Agendamentos Hoje** → `/agenda`  
  - **Fila de Espera** → `/fila-espera`  
  - **Mensagens Pendentes** → `/mensagens`  
- Melhorias de performance: memorizar queries e usar loaders com `try/finally` (sem loops).

---

## 6) APP PACIENTE (RESTORE RÁPIDO)
1. **Login** usa o AuthContext estável (já corrigido).  
2. **Agendar**: após escolher data, listar **apenas horários livres** (filtrar overlaps).  
3. **Chat**: usar `agent-ia` com contexto (`ia_contextos`).  
4. **Histórico**: listar agendamentos (`paciente_id`) e estados (compareceu, faltou, etc. — se ainda não existir, exibir apenas agendamentos).  
5. **Feriados**: bloqueiam oferta de horários.

---

## 7) AGENTE DE IA — BASE ÚNICA & FLUXO CONTÍNUO
- **Base de Conhecimento**: arquivo único **`/knowledge/base_conhecimento.txt`** lido na `agent-ia`.  
- **Prompt padrão**: cumprimentar, identificar motivo, conduzir etapas (agendar/cancelar/exames), **perguntar o próximo dado faltante** e **concluir**.  
- **Ações**: quando intenção = `agendar`, chamar `/api/agendamentos` (POST) com os dados coletados; quando `cancelar`, colocar `status='cancelado'`.  
- **Contexto**: salvar resumo no `ia_contextos` a cada troca de mensagens.

---

## 8) WHATSAPP (AVISA API) — REGRAS DE TESTE
- Apenas enviar mensagens automáticas para **+55 16 98870‑7777** durante validação.  
- Webhook ativo em `/api/whatsapp-webhook` → grava `whatsapp_messages`.  
- Templates mínimos seed (boas-vindas, confirmação, lembrete).

---

## 9) SEED DE USUÁRIOS (opcional)
```sql
insert into usuarios (nome, email, perfil, ativo) values
('Alencar','alencar@medintelli.com.br','Admin',true),
('Silvia','silvia@medintelli.com.br','Admin',true),
('Gabriel','gabriel@medintelli.com.br','Auxiliar',true),
('Natashia','natashia@medintelli.com.br','Secretaria',true),
('Dr. Francisco','drfrancisco@medintelli.com.br','Medico',true)
on conflict (email) do nothing;
```
> Ajustar a camada de autenticação (Supabase Auth) para vincular `usuarios.email` aos logins criados.

---

## 10) CHECKLIST DE VALIDAÇÃO (CLIENTE)
### Etapa 1
- Usuários & Perfis: cadastrar 1 por perfil.  
- Pacientes: cadastrar 20; alterar telefone de 3.  
- Feriados: cadastrar municipais, sincronizar nacionais e ver na Agenda (Sistema & App).
- Agenda Manual: 5 agendamentos; 3 com paciente novo; 2 cancelamentos; 2 reagendamentos; bloquear horários ocupados no App.
- Lista de Espera: 5 novos + 3 existentes; alterar telefones; DnD + agendar da fila.

### Etapa 2
- Enviar mensagens manualmente (App & WhatsApp).  
- 3 pacientes simulando conversas (App e WhatsApp).  
- Encaminhar 5 mensagens ao **Dr. Francisco**; ao concluir, ir para histórico.  
- 5 agendamentos via chat/WhatsApp; refletir na Agenda do Sistema & App.

---

## 11) TROUBLESHOOTING RÁPIDO
- **Loop de login**: redirecionar **apenas** após `sessionChecked=true`.  
- **Erro feriados**: `SERVICE_ROLE` na Edge; calcular `mes/dia_mes`; tratar RLS.  
- **Agendamento não aparece**: GET com `start/end` corretos e `status in ('pendente','confirmado')`.  
- **Fila não salva**: `POST` aceitar `paciente_novo` e preencher `pos`.  
- **Mensagens em loop**: `useEffect` com cleanup, `setInterval` com clear e “vazio amigável”.

---

## 12) DEPLOY & CI/CD (resumo)
```bash
# Edge Functions
supabase functions deploy agendamentos
supabase functions deploy fila-espera
supabase functions deploy feriados-sync
supabase functions deploy agent-ia
supabase functions deploy whatsapp-send-message
supabase functions deploy whatsapp-webhook-receiver

# Migrations / DB
supabase db push
```

**Pronto.** Restaurar seguindo este guia devolve todas as funções do Sistema Principal mantendo o login atual e garantindo a integração com App Paciente, WhatsApp e IA.

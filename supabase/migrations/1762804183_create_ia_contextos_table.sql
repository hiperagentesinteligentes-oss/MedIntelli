-- Migration: create_ia_contextos_table
-- Created at: 1762804183

create table if not exists ia_contextos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  origem text default 'app', -- 'app' ou 'whatsapp'
  contexto jsonb,
  status text default 'ativo', -- 'ativo' ou 'concluido'
  criado_em timestamp default now(),
  atualizado_em timestamp default now()
);

create index idx_ia_contextos_paciente on ia_contextos(paciente_id);

-- Tabela para logs de mensagens da IA
create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  mensagem_original text,
  analise_ia jsonb,
  modelo_usado text,
  created_at timestamp default now()
);

create index idx_message_logs_paciente on message_logs(paciente_id);;
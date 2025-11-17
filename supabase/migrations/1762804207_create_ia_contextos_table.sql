-- Migration: create_ia_contextos_table
-- Created at: 1762804207

create table if not exists ia_contextos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid,
  origem text default 'app',
  contexto jsonb,
  status text default 'ativo',
  criado_em timestamp default now(),
  atualizado_em timestamp default now()
);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid,
  mensagem_original text,
  analise_ia jsonb,
  modelo_usado text,
  created_at timestamp default now()
);;
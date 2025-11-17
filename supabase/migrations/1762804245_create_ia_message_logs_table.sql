-- Migration: create_ia_message_logs_table
-- Created at: 1762804245

create table if not exists ia_message_logs (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid,
  mensagem_original text,
  analise_ia jsonb,
  modelo_usado text,
  created_at timestamp default now()
);

create index if not exists idx_ia_message_logs_paciente on ia_message_logs(paciente_id);

-- RLS policies para as novas tabelas
alter table ia_contextos enable row level security;
alter table ia_message_logs enable row level security;

-- Política para permitir leitura/escrita para service role
create policy "ia_contextos_service_role" on ia_contextos
  for all 
  using (auth.role() = 'service_role');

create policy "ia_message_logs_service_role" on ia_message_logs
  for all 
  using (auth.role() = 'service_role');;
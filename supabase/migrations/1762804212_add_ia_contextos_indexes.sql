-- Migration: add_ia_contextos_indexes
-- Created at: 1762804212

create index if not exists idx_ia_contextos_paciente on ia_contextos(paciente_id);
create index if not exists idx_message_logs_paciente on message_logs(paciente_id);

-- RLS policies para as novas tabelas
alter table ia_contextos enable row level security;
alter table message_logs enable row level security;

-- Política para permitir leitura/escrita para service role
create policy if not exists "ia_contextos_service_role" on ia_contextos
  for all 
  using (auth.role() = 'service_role');

create policy if not exists "message_logs_service_role" on message_logs
  for all 
  using (auth.role() = 'service_role');;
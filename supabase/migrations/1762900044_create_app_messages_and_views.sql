-- Migration: create_app_messages_and_views
-- Created at: 1762900044

-- Criar tabela app_messages conforme especificações
create table if not exists app_messages (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete set null,
  conteudo text not null,
  lida boolean default false,
  origem text default 'app',
  created_at timestamp default now()
);

-- Criar view para mensagens não lidas do app
create or replace view vw_unread_app as
select paciente_id, count(*)::int as nao_lidas
from app_messages
where coalesce(lida,false) = false
group by paciente_id;

-- Criar view para mensagens não lidas do WhatsApp (ajustando a consulta para a estrutura existente)
create or replace view vw_unread_whats as
select paciente_id, count(*)::int as nao_lidas
from whatsapp_messages
where coalesce(status_envio,'pendente') in ('enviado','entregue') 
and coalesce(lida,false)=false
group by paciente_id;;
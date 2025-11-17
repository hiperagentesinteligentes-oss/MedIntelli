-- Migration: create_views_for_unread_messages
-- Created at: 1762900059

-- Criar view para mensagens não lidas do app paciente (usando tabela existente)
create or replace view vw_unread_app as
select paciente_id, count(*)::int as nao_lidas
from mensagens_app_paciente
where coalesce(lida,false) = false
group by paciente_id;

-- Criar view para mensagens não lidas do WhatsApp
create or replace view vw_unread_whats as
select patient_id as paciente_id, count(*)::int as nao_lidas
from whatsapp_messages
where delivery_status in ('enviado','entregue') 
and coalesce(lida,false)=false
group by patient_id;;
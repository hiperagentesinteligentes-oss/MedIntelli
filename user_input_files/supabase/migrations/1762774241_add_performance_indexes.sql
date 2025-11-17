-- Migration: add_performance_indexes
-- Created at: 1762774241

-- Índices para melhorar performance

-- Agendamentos: busca por data e status
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
ON agendamentos(data_agendamento, status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_medico_data 
ON agendamentos(medico_id, data_agendamento);

-- WhatsApp Messages: busca por timestamp e conversation
CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp 
ON whatsapp_messages(timestamp DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sent_at 
ON whatsapp_messages(sent_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation 
ON whatsapp_messages(conversation_id, timestamp DESC NULLS LAST);

-- Fila de Espera: ordenação por posição e data
CREATE INDEX IF NOT EXISTS idx_fila_posicao_status 
ON fila_espera(posicao_atual, status) WHERE status = 'aguardando';

CREATE INDEX IF NOT EXISTS idx_fila_created_at 
ON fila_espera(created_at DESC);

-- Mensagens App Paciente: busca por paciente e status
CREATE INDEX IF NOT EXISTS idx_mensagens_app_paciente_status 
ON mensagens_app_paciente(status, data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_app_paciente_id 
ON mensagens_app_paciente(paciente_id, data_criacao DESC);

-- Pacientes: busca por nome e ativo
CREATE INDEX IF NOT EXISTS idx_pacientes_nome 
ON pacientes(nome);

CREATE INDEX IF NOT EXISTS idx_pacientes_ativo 
ON pacientes(ativo) WHERE ativo = true;;
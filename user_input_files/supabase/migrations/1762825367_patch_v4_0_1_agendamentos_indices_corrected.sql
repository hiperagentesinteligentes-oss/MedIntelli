-- Migration: patch_v4_0_1_agendamentos_indices_corrected
-- Created at: 1762825367

-- Patch v4.0.1: Criar índices em agendamentos para otimização de performance (CORRIGIDO)
CREATE INDEX IF NOT EXISTS idx_agend_data_agendamento ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agend_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agend_paciente ON agendamentos(paciente_id);;
-- Migration: patch_v4_0_1_agendamentos_indices
-- Created at: 1762825331

-- Patch v4.0.1: Criar índices em agendamentos para otimização de performance
CREATE INDEX IF NOT EXISTS idx_agend_inicio ON agendamentos(inicio);
CREATE INDEX IF NOT EXISTS idx_agend_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agend_paciente ON agendamentos(paciente_id);;
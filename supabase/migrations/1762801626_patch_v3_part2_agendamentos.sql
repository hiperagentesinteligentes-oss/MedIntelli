-- Migration: patch_v3_part2_agendamentos
-- Created at: 1762801626

-- Migration: patch_v3_part2_agendamentos
-- Parte 2: Índices para Agendamentos

-- Índices para Agendamentos (garantia)
CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_data ON agendamentos(paciente_id, data_agendamento);

-- Resultado
SELECT 'Parte 2: Agendamentos - Concluído' AS result;;
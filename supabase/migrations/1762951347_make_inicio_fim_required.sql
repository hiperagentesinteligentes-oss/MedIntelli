-- Migration: make_inicio_fim_required
-- Created at: 1762951347

-- Atualizar registros existentes que nao tem inicio/fim
UPDATE agendamentos 
SET 
  inicio = data_agendamento,
  fim = data_agendamento + (COALESCE(duracao_minutos, 30) || ' minutes')::INTERVAL
WHERE inicio IS NULL OR fim IS NULL;

-- Tornar inicio e fim obrigatorios
ALTER TABLE agendamentos 
  ALTER COLUMN inicio SET NOT NULL,
  ALTER COLUMN fim SET NOT NULL;

-- Remover defaults
ALTER TABLE agendamentos 
  ALTER COLUMN inicio DROP DEFAULT,
  ALTER COLUMN fim DROP DEFAULT;;
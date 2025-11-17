-- Migration: add_inicio_fim_to_agendamentos
-- Created at: 1762944729


-- Adicionar colunas inicio e fim
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS inicio TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fim TIMESTAMPTZ;

-- Popular inicio com data_agendamento existente
UPDATE agendamentos 
SET inicio = data_agendamento
WHERE inicio IS NULL AND data_agendamento IS NOT NULL;

-- Popular fim calculando data_agendamento + duracao_minutos
UPDATE agendamentos 
SET fim = data_agendamento + (COALESCE(duracao_minutos, 30) || ' minutes')::INTERVAL
WHERE fim IS NULL AND data_agendamento IS NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos(inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_fim ON agendamentos(fim);
CREATE INDEX IF NOT EXISTS idx_agendamentos_range ON agendamentos(inicio, fim);
;
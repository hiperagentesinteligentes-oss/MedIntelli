-- Migration: patch_v4_0_6_feriados_recorrente
-- Created at: 1762825346

-- Patch v4.0.6: Adicionar campos recorrência em feriados
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false;
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS mes INTEGER;
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS dia_mes INTEGER;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_feriados_mes ON feriados(mes);
CREATE INDEX IF NOT EXISTS idx_feriados_dia_mes ON feriados(dia_mes);
CREATE INDEX IF NOT EXISTS idx_feriados_recorrente ON feriados(recorrente);;
-- Migration: patch_v4_0_4_fila_espera_ordenacao
-- Created at: 1762825340

-- Patch v4.0.4: Adicionar campo ordenacao em fila_espera
ALTER TABLE fila_espera ADD COLUMN IF NOT EXISTS ordenacao JSONB;;
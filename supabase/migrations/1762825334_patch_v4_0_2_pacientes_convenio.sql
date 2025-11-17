-- Migration: patch_v4_0_2_pacientes_convenio
-- Created at: 1762825334

-- Patch v4.0.2: Adicionar campo convenio na tabela pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS convenio VARCHAR(100) DEFAULT 'UNIMED';
ALTER TABLE pacientes ADD CONSTRAINT chk_convenio CHECK (convenio IN ('UNIMED', 'UNIMED UNIFÁCIL', 'CASSI', 'CABESP', 'PARTICULAR'));;
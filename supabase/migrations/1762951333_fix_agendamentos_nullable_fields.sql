-- Migration: fix_agendamentos_nullable_fields
-- Created at: 1762951333

-- Tornar data_agendamento e hora_agendamento opcionais (campos legados)
ALTER TABLE agendamentos 
  ALTER COLUMN data_agendamento DROP NOT NULL,
  ALTER COLUMN hora_agendamento DROP NOT NULL;

-- Garantir que inicio e fim existem e sao obrigatorios
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='agendamentos' AND column_name='inicio'
  ) THEN
    ALTER TABLE agendamentos ADD COLUMN inicio TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='agendamentos' AND column_name='fim'
  ) THEN
    ALTER TABLE agendamentos ADD COLUMN fim TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos(inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_fim ON agendamentos(fim);

COMMENT ON COLUMN agendamentos.data_agendamento IS 'Campo legado - use inicio/fim';
COMMENT ON COLUMN agendamentos.hora_agendamento IS 'Campo legado - use inicio/fim';;
-- Migration: patch_v3_part1_fila_espera
-- Created at: 1762801621

-- Migration: patch_v3_part1_fila_espera
-- Parte 1: Fila de Espera - Colunas e Índices

-- Garantir que a coluna 'pos' existe (para persistir posição do DnD)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fila_espera' AND column_name = 'pos') THEN
        ALTER TABLE fila_espera ADD COLUMN pos INTEGER;
        -- Inicializar posições baseado na ordem de criação
        UPDATE fila_espera 
        SET pos = (
            SELECT ROW_NUMBER() OVER (ORDER BY data_entrada ASC)
            FROM fila_espera f2 
            WHERE f2.id = fila_espera.id
        );
    END IF;
END $$;

-- Garantir que agendamento_id existe na fila_espera
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fila_espera' AND column_name = 'agendamento_id') THEN
        ALTER TABLE fila_espera ADD COLUMN agendamento_id UUID REFERENCES agendamentos(id);
    END IF;
END $$;

-- Índices para Fila de Espera
CREATE INDEX IF NOT EXISTS idx_fila_espera_pos ON fila_espera(pos) WHERE pos IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fila_espera_created ON fila_espera(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fila_espera_status ON fila_espera(status);

-- Resultado
SELECT 'Parte 1: Fila de Espera - Concluído' AS result;;
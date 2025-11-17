-- Migration: patch_v3_part3_feriados
-- Created at: 1762801634

-- Migration: patch_v3_part3_feriados
-- Parte 3: Feriados - Recorrência e Dados

-- Garantir que a coluna 'recorrente' existe (alias para recorrente_anual)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feriados' AND column_name = 'recorrente') THEN
        ALTER TABLE feriados ADD COLUMN recorrente BOOLEAN DEFAULT false;
        -- Copiar valores de recorrente_anual
        UPDATE feriados SET recorrente = recorrente_anual WHERE recorrente_anual IS NOT NULL;
    END IF;
END $$;

-- Limpar dados inválidos antes da conversão de tipo
UPDATE feriados 
SET dia_mes = NULL 
WHERE dia_mes ~ '^[0-9]{2}-[0-9]{2}$' OR dia_mes ~ '^[0-9]{1}-[0-9]{2}$';

-- Garantir que a coluna 'dia_mes' está como INTEGER
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feriados' AND column_name = 'dia_mes' 
               AND data_type = 'character varying') THEN
        ALTER TABLE feriados ALTER COLUMN dia_mes TYPE INTEGER USING (dia_mes::INTEGER);
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'feriados' AND column_name = 'dia_mes') THEN
        ALTER TABLE feriados ADD COLUMN dia_mes INTEGER;
    END IF;
END $$;

-- Garantir que a coluna 'mes' existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feriados' AND column_name = 'mes') THEN
        ALTER TABLE feriados ADD COLUMN mes INTEGER;
    END IF;
END $$;

-- Atualizar dados existentes de feriados
UPDATE feriados 
SET 
    recorrente = COALESCE(recorrente_anual, false),
    mes = COALESCE(mes, EXTRACT(MONTH FROM data)::INTEGER),
    dia_mes = COALESCE(dia_mes::INTEGER, EXTRACT(DAY FROM data)::INTEGER)
WHERE data IS NOT NULL;

-- Resultado
SELECT 'Parte 3: Feriados - Concluído' AS result;;
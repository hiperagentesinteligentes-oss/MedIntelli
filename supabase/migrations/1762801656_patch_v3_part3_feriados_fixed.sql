-- Migration: patch_v3_part3_feriados_fixed
-- Created at: 1762801656

-- Migration: patch_v3_part3_feriados_fixed
-- Parte 3: Feriados - Recorrência e Dados + Função Ajustada

-- Primeiro, recriar a função sincronizar_agendamento_feriado com tipos corretos
CREATE OR REPLACE FUNCTION public.sincronizar_agendamento_feriado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    agendamentos_afetados INTEGER := 0;
    data_feriado DATE;
    dia_mes_feriado INTEGER;
BEGIN
    -- Para feriados que não permitem agendamento, bloquear agendamentos
    IF NEW.permite_agendamento = false THEN
        -- Determinar a data do feriado
        IF NEW.recorrente_anual = true AND NEW.dia_mes IS NOT NULL THEN
            -- Para feriados recorrentes, bloquear para os próximos 2 anos
            INSERT INTO public.logs_sincronizacao (tabela, operacao, registros_afetados, observacoes)
            SELECT 'agendamentos', 'BLOQUEAR_POR_FERIADO_RECORRENTE', 0, 
                   'Feriado recorrente: ' || NEW.nome || ' (' || NEW.dia_mes || ')'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.logs_sincronizacao 
                WHERE observacoes = 'Feriado recorrente: ' || NEW.nome || ' (' || NEW.dia_mes || ')'
                AND DATE(created_at) = CURRENT_DATE
            );
        ELSE
            -- Para feriados específicos, bloquear apenas na data específica
            IF NEW.data IS NOT NULL THEN
                -- Atualizar agendamentos que caem neste feriado
                UPDATE public.agendamentos 
                SET 
                    status = 'bloqueado_feriado',
                    observacoes = COALESCE(observacoes, '') || ' | Bloqueado por feriado: ' || NEW.nome,
                    updated_at = NOW()
                WHERE data_agendamento = NEW.data 
                AND status NOT IN ('cancelado', 'concluido', 'bloqueado_feriado');
                
                GET DIAGNOSTICS agendamentos_afetados = ROW_COUNT;
                
                -- Log da sincronização
                INSERT INTO public.logs_sincronizacao (tabela, operacao, registros_afetados, observacoes)
                VALUES (
                    'agendamentos', 
                    'BLOQUEAR_POR_FERIADO', 
                    agendamentos_afetados, 
                    'Feriado: ' || NEW.nome || ' em ' || NEW.data || '. ' || agendamentos_afetados || ' agendamentos afetados.'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

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
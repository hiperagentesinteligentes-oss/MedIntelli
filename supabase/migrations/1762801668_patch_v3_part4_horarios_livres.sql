-- Migration: patch_v3_part4_horarios_livres
-- Created at: 1762801668

-- Migration: patch_v3_part4_horarios_livres
-- Parte 4: RPC - Função horarios_livres

-- Remover função existente se houver
DROP FUNCTION IF EXISTS public.horarios_livres(DATE);

-- Criar função horarios_livres otimizada
CREATE OR REPLACE FUNCTION public.horarios_livres(_dia DATE)
RETURNS TABLE(inicio TIMESTAMPTZ, fim TIMESTAMPTZ)
LANGUAGE PLPGSQL 
STABLE
SECURITY DEFINER
AS $$
DECLARE
    cursor_time TIMESTAMPTZ := (_dia::TIMESTAMPTZ + TIME '08:00');
    end_time TIMESTAMPTZ := (_dia::TIMESTAMPTZ + TIME '18:00');
    overl INTEGER;
    slot_duration INTERVAL := INTERVAL '30 minutes';
BEGIN
    -- Loop pelos slots de 30min
    WHILE cursor_time < end_time LOOP
        -- Verificar conflitos com agendamentos existentes
        SELECT COUNT(*)::INTEGER INTO overl
        FROM agendamentos a
        WHERE a.status NOT IN ('cancelado', 'cancelado_paciente', 'cancelado_clinica')
          AND a.data_agendamento < cursor_time + slot_duration
          AND (a.data_agendamento + (COALESCE(a.duracao_minutos, 30) || ' minutes')::INTERVAL) > cursor_time
          AND a.data_agendamento::DATE = _dia;

        -- Se não há conflito, adicionar slot livre
        IF overl = 0 THEN
            -- Verificar se o slot não é um feriado
            IF NOT EXISTS (
                SELECT 1 FROM feriados f 
                WHERE f.data = _dia 
                  AND f.permite_agendamento = false
            ) THEN
                inicio := cursor_time;
                fim := cursor_time + slot_duration;
                RETURN NEXT;
            END IF;
        END IF;

        cursor_time := cursor_time + slot_duration;
    END LOOP;
END;
$$;

-- Permitir uso da função para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.horarios_livres(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.horarios_livres(DATE) TO anon;

-- Comentários para documentação
COMMENT ON FUNCTION public.horarios_livres(DATE) IS 'Retorna slots de 30min livres entre 08:00-18:00, considerando agendamentos e feriados';

-- Resultado
SELECT 'Parte 4: Função horarios_livres - Concluído' AS result;;
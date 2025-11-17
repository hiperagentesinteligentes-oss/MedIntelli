-- Migration: patch_pack_v3_complete
-- Created at: 1762801589

-- Migration: patch_pack_v3_complete
-- Created at: 1762797290
-- MedIntelli Patch Pack V3 - Melhorias de Performance e Funcionalidades

-- ==================================================
-- PARTE 1: FILA DE ESPERA - Melhores para DnD
-- ==================================================

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

-- ==================================================
-- PARTE 2: ÍNDICES DE PERFORMANCE
-- ==================================================

-- Índices para Fila de Espera
CREATE INDEX IF NOT EXISTS idx_fila_espera_pos ON fila_espera(pos) WHERE pos IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fila_espera_created ON fila_espera(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fila_espera_status ON fila_espera(status);

-- Índices para Agendamentos (garantia)
CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_data ON agendamentos(paciente_id, data_agendamento);

-- ==================================================
-- PARTE 3: FERIADOS - Recorrência e Dados
-- ==================================================

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

-- ==================================================
-- PARTE 4: RPC - Função horarios_livres
-- ==================================================

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

-- ==================================================
-- PARTE 5: Grant Permissions
-- ==================================================

-- Permitir uso da função para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.horarios_livres(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.horarios_livres(DATE) TO anon;

-- ==================================================
-- PARTE 6: Validação Final
-- ==================================================

-- Comentários para documentação
COMMENT ON COLUMN fila_espera.pos IS 'Posição do item na fila para drag-and-drop (Ordem do 1 em diante)';
COMMENT ON COLUMN fila_espera.agendamento_id IS 'ID do agendamento vinculado (obrigatório para agendar posteriormente)';
COMMENT ON COLUMN feriados.recorrente IS 'Indica se o feriado se repete anualmente';
COMMENT ON COLUMN feriados.dia_mes IS 'Dia do mês para feriados recorrentes (1-31)';
COMMENT ON COLUMN feriados.mes IS 'Mês do feriado recorrente (1-12)';
COMMENT ON FUNCTION public.horarios_livres(DATE) IS 'Retorna slots de 30min livres entre 08:00-18:00, considerando agendamentos e feriados';

-- Resultado final
SELECT 'Patch Pack V3 - Migration Completed Successfully' AS result;;
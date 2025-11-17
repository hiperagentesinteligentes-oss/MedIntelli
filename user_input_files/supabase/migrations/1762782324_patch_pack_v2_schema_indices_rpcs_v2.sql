-- Migration: patch_pack_v2_schema_indices_rpcs_v2
-- Created at: 1762782324

-- FASE 1.1: Novas colunas e índices

-- FILA: posição DnD + vínculo obrigatório ao agendamento
ALTER TABLE fila_espera ADD COLUMN IF NOT EXISTS pos INTEGER;
ALTER TABLE fila_espera ADD COLUMN IF NOT EXISTS agendamento_id UUID REFERENCES agendamentos(id);
CREATE INDEX IF NOT EXISTS idx_fila_pos ON fila_espera(pos);
CREATE INDEX IF NOT EXISTS idx_fila_agendamento ON fila_espera(agendamento_id);

-- FERIADOS: adicionar coluna mes (integer) se não existir
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS mes INTEGER;

-- Atualizar valores existentes em feriados (converter dia_mes e adicionar mes)
UPDATE feriados 
SET mes = EXTRACT(MONTH FROM data)::INTEGER
WHERE mes IS NULL;

-- PACIENTES: garantir índices
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefone ON pacientes(telefone);

-- AGENDA: performance (usar data_agendamento que existe)
CREATE INDEX IF NOT EXISTS idx_agend_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agend_paciente ON agendamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_agend_status ON agendamentos(status);

-- WHATSAPP: performance mensagens (usar patient_id)
CREATE INDEX IF NOT EXISTS idx_whats_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whats_patient ON whatsapp_messages(patient_id);

-- FASE 1.2: RPCs para contagem e slots livres

-- RPC: contagem de agendamentos por dia
CREATE OR REPLACE FUNCTION public.agenda_contagem_por_dia(_inicio TIMESTAMPTZ, _fim TIMESTAMPTZ)
RETURNS TABLE(dia DATE, total BIGINT)
LANGUAGE SQL STABLE AS $$
  SELECT (a.data_agendamento AT TIME ZONE 'America/Sao_Paulo')::DATE AS dia, COUNT(*) AS total
  FROM agendamentos a
  WHERE a.data_agendamento >= _inicio 
    AND a.data_agendamento < _fim 
    AND a.status <> 'cancelado'
  GROUP BY 1 
  ORDER BY 1;
$$;

-- RPC: horários livres (slots de 30 min, 08:00-18:00)
CREATE OR REPLACE FUNCTION public.horarios_livres(_dia DATE)
RETURNS TABLE(inicio TIMESTAMPTZ, fim TIMESTAMPTZ)
LANGUAGE PLPGSQL STABLE AS $$
DECLARE
  cursor_time TIMESTAMPTZ := (_dia::TIMESTAMPTZ + TIME '08:00');
  end_time TIMESTAMPTZ := (_dia::TIMESTAMPTZ + TIME '18:00');
  overl BIGINT;
BEGIN
  WHILE cursor_time < end_time LOOP
    -- Verificar se há sobreposição com agendamentos existentes
    SELECT COUNT(1) INTO overl
    FROM agendamentos a
    WHERE a.status <> 'cancelado'
      AND a.data_agendamento < cursor_time + INTERVAL '30 minutes'
      AND a.data_agendamento + (COALESCE(a.duracao_minutos, 30) || ' minutes')::INTERVAL > cursor_time;

    IF overl = 0 THEN
      inicio := cursor_time;
      fim := cursor_time + INTERVAL '30 minutes';
      RETURN NEXT;
    END IF;

    cursor_time := cursor_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;;
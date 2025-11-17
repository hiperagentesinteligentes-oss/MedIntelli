-- Migration: agenda_contagem_por_dia_function
-- Created at: 1762746470

-- Função para contagem de agendamentos por dia
CREATE OR REPLACE FUNCTION public.agenda_contagem_por_dia(_inicio timestamptz, _fim timestamptz)
RETURNS TABLE(dia date, total bigint)
LANGUAGE sql STABLE AS $$
  SELECT (a.data_agendamento at time zone 'America/Sao_Paulo')::date as dia,
         COUNT(*) as total
  FROM agendamentos a
  WHERE a.data_agendamento >= _inicio 
    AND a.data_agendamento < _fim
    AND a.status NOT IN ('cancelado', 'cancelled')
  GROUP BY 1
  ORDER BY 1;
$$;

-- Comentários para a função
COMMENT ON FUNCTION public.agenda_contagem_por_dia IS 'Conta agendamentos por dia dentro de um período, excluindo cancelados';;
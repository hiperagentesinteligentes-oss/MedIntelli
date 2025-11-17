-- Migration: add_ia_contextos_index_only
-- Created at: 1762804232

create index if not exists idx_ia_contextos_paciente on ia_contextos(paciente_id);;
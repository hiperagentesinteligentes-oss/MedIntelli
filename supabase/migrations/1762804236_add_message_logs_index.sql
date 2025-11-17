-- Migration: add_message_logs_index
-- Created at: 1762804236

create index if not exists idx_message_logs_paciente on message_logs(paciente_id);;
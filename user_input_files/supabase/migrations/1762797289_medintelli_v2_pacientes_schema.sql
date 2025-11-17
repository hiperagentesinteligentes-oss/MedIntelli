-- Migration: medintelli_v2_pacientes_schema
-- Created at: 1762797289

-- MedIntelli V2 - Schema Pacientes + Indices
-- Data: 2025-11-11

-- 1. Adicionar colunas na tabela pacientes
alter table pacientes 
  add column if not exists ativo boolean default true,
  add column if not exists convenio text check (convenio in ('UNIMED','UNIMED UNIFACIL','CASSI','CABESP'));

-- 2. Criar indices de performance
create index if not exists idx_pacientes_nome on pacientes(nome);
create index if not exists idx_pacientes_telefone on pacientes(telefone);
create index if not exists idx_pacientes_email on pacientes(email);
create index if not exists idx_pacientes_ativo on pacientes(ativo);
create index if not exists idx_pacientes_convenio on pacientes(convenio);

-- 3. Atualizar pacientes existentes para ativo=true
update pacientes set ativo = true where ativo is null;

-- 4. Comentarios para documentacao
comment on column pacientes.ativo is 'Indica se o paciente esta ativo no sistema (soft delete)';
comment on column pacientes.convenio is 'Convenio medico do paciente: UNIMED, UNIMED UNIFACIL, CASSI, CABESP';;
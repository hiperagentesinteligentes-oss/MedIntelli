# Patch Pack v4 - Execução SQL - Schema & Índices

**Data de Execução:** 2025-11-11 09:18:16
**Objetivo:** Implementar correções SQL do Patch Pack v4

## 0.1 AGENDAMENTOS - Índices para Exibição Correta

```sql
create index if not exists idx_agend_inicio    on agendamentos(inicio);
create index if not exists idx_agend_status    on agendamentos(status);
create index if not exists idx_agend_paciente  on agendamentos(paciente_id);
```

## 0.2 PACIENTES - Convênio "PARTICULAR" + Tipo de Consulta

```sql
-- Adicionar convênio PARTICULAR ao check
alter table pacientes
  drop constraint if exists pacientes_convenio_check;

alter table pacientes
  add constraint pacientes_convenio_check 
  check (convenio in ('UNIMED','UNIMED UNIFÁCIL','CASSI','CABESP','PARTICULAR'));

-- Criar tabela tipos_consulta
create table if not exists tipos_consulta (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  criado_em timestamp default now()
);

-- Inserir tipos padrão
insert into tipos_consulta (nome)
  values ('Primeira consulta'), ('Retorno'), ('Urgente'), ('Telemedicina')
on conflict (nome) do nothing;
```

## 0.3 FILA DE ESPERA - Listar/Salvar/Ordenar

```sql
-- Adicionar coluna pos se não existir
alter table fila_espera add column if not exists pos int;

-- Índices de performance
create index if not exists idx_fila_created on fila_espera(created_at);
create index if not exists idx_fila_pos     on fila_espera(pos);
```

## 0.4 FERIADOS - CRUD + Recorrência

```sql
-- Adicionar campos recorrência
alter table feriados
  add column if not exists recorrente boolean default false,
  add column if not exists dia_mes int,
  add column if not exists mes int;

-- Atualizar dados existentes
update feriados
  set dia_mes = extract(day from data), mes = extract(month from data)
where dia_mes is null or mes is null;
```

## 0.5 VISÕES AUXILIARES - Contadores Não Lidas

```sql
-- Vista mensagens não lidas APP
create or replace view vw_unread_app as
select paciente_id, count(*) as nao_lidas
from app_messages
where lida = false
group by paciente_id;

-- Vista mensagens não lidas WhatsApp
create or replace view vw_unread_whats as
select paciente_id, count(*) as nao_lidas
from whatsapp_messages
where status_envio in ('enviado','entregue') and coalesce(lida,false)=false
group by paciente_id;
```

## Status da Execução

*Documento será atualizado com o resultado de cada operação SQL*
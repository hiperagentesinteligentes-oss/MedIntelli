CREATE TABLE agendamentos (
    id uuid primary key default gen_random_uuid(),
    paciente_id uuid references pacientes(id),
    inicio timestamptz not null,
    fim timestamptz not null,
    status text not null check (status in ('pendente','confirmado','cancelado','atrasado','em_atendimento')),
    origem text not null check (origem in ('app','manual','whatsapp','ia')),
    observacoes text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
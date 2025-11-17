CREATE TABLE fila_espera (
    id uuid primary key default gen_random_uuid(),
    paciente_id uuid references pacientes(id),
    motivo text,
    prioridade text check (prioridade in ('baixa','media','alta','urgente')) default 'media',
    status text check (status in ('ativo','atendido','removido')) default 'ativo',
    created_at timestamptz default now()
);
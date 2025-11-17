CREATE TABLE pacientes (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    data_nascimento date,
    email text,
    telefone text,
    telefone_alt text,
    convenio text,
    endereco text,
    contato_nome text,
    created_at timestamptz default now()
);
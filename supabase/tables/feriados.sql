CREATE TABLE feriados (
    id uuid primary key default gen_random_uuid(),
    data date not null,
    titulo text not null,
    escopo text not null check (escopo in ('nacional','municipal')),
    municipio text,
    uf char(2),
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);
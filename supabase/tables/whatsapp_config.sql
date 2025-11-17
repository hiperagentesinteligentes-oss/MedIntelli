CREATE TABLE whatsapp_config (
    id uuid primary key default gen_random_uuid(),
    chave text unique not null,
    valor text not null,
    descricao text,
    updated_at timestamptz default now()
);
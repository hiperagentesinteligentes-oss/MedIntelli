CREATE TABLE whatsapp_templates (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    categoria text not null,
    tipo text not null,
    conteudo_template text not null,
    variaveis jsonb,
    ativo boolean default true,
    created_at timestamptz default now()
);
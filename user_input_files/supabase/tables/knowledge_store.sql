CREATE TABLE knowledge_store (
    id uuid primary key default gen_random_uuid(),
    version int not null,
    content text not null,
    active boolean default false,
    created_at timestamptz default now()
);
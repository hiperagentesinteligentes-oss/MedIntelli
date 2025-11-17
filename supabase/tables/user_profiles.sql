CREATE TABLE user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    perfil text not null check (perfil in ('SUPERADMIN','ADMIN','Medico','Secretaria','Auxiliar')),
    created_at timestamptz default now()
);
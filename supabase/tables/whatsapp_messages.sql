CREATE TABLE whatsapp_messages (
    id uuid primary key default gen_random_uuid(),
    paciente_id uuid references pacientes(id),
    categoria text not null,
    tipo text not null,
    conteudo text not null,
    template_id text,
    destinatario_telefone text not null,
    status_envio text default 'pendente',
    mensagem_origem text default 'sistema',
    data_agendamento timestamptz,
    avisa_message_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
-- Migration: patch_v4_0_3_tipos_consulta
-- Created at: 1762825337

-- Patch v4.0.3: Criar tabela tipos_consulta com valores predefinidos
CREATE TABLE IF NOT EXISTS tipos_consulta (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tipos_consulta (nome, ativo) VALUES 
    ('Primeira consulta', true),
    ('Retorno', true),
    ('Urgente', true),
    ('Telemedicina', true)
ON CONFLICT DO NOTHING;

-- Adicionar coluna tipo_consulta_id na tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo_consulta_id INTEGER REFERENCES tipos_consulta(id);;
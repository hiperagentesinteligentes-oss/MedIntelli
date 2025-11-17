-- Migration: create_base_conhecimento_table_v2
-- Created at: 1762776934

-- Criar tabela para Base Única de Conhecimento
CREATE TABLE IF NOT EXISTS base_conhecimento (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar versão mais recente
CREATE INDEX idx_base_conhecimento_version ON base_conhecimento(version DESC);
CREATE INDEX idx_base_conhecimento_created_at ON base_conhecimento(created_at DESC);

-- Habilitar RLS
ALTER TABLE base_conhecimento ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados)
CREATE POLICY "Usuários autenticados podem ler BUC"
ON base_conhecimento FOR SELECT
TO authenticated
USING (true);

-- Policy para inserção (apenas super_admin e administrador)
CREATE POLICY "Apenas admins podem criar versões BUC"
ON base_conhecimento FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin', 'administrador')
    )
);;
-- Migration: create_buc_versoes_table
-- Created at: 1762776960

-- Criar tabela para versionamento da Base Única de Conhecimento
CREATE TABLE IF NOT EXISTS buc_versoes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar versão mais recente
CREATE INDEX IF NOT EXISTS idx_buc_versoes_version ON buc_versoes(version DESC);
CREATE INDEX IF NOT EXISTS idx_buc_versoes_created_at ON buc_versoes(created_at DESC);

-- Habilitar RLS
ALTER TABLE buc_versoes ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados)
CREATE POLICY "Usuários autenticados podem ler BUC versões"
ON buc_versoes FOR SELECT
TO authenticated
USING (true);

-- Policy para inserção (apenas super_admin e administrador)
CREATE POLICY "Apenas admins podem criar versões BUC"
ON buc_versoes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin', 'administrador')
    )
);;
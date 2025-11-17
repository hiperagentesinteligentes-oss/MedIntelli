-- Migration: fix_validacoes_sistema_rls
-- Created at: 1762893647

-- Desabilitar RLS na tabela validacoes_sistema para permitir acesso publico
ALTER TABLE validacoes_sistema DISABLE ROW LEVEL SECURITY;

-- Ou criar politica permissiva se RLS deve estar habilitado
-- DROP POLICY IF EXISTS "Allow public access" ON validacoes_sistema;
-- CREATE POLICY "Allow public access" ON validacoes_sistema FOR ALL USING (true) WITH CHECK (true);
;
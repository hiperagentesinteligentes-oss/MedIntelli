-- Migration: RLS Policies for feriados table
-- Data: 2025-11-11
-- Objetivo: Implementar Row Level Security na tabela feriados

-- Habilitar RLS na tabela feriados
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
CREATE POLICY "feriados_select_authenticated" 
ON feriados FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir INSERT para usuários autenticados
CREATE POLICY "feriados_insert_authenticated" 
ON feriados FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "feriados_update_authenticated" 
ON feriados FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir DELETE para usuários autenticados
CREATE POLICY "feriados_delete_authenticated" 
ON feriados FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Comentários para documentar as políticas
COMMENT ON POLICY "feriados_select_authenticated" ON feriados IS 'Permite leitura de feriados para usuários autenticados';
COMMENT ON POLICY "feriados_insert_authenticated" ON feriados IS 'Permite inserção de feriados para usuários autenticados';
COMMENT ON POLICY "feriados_update_authenticated" ON feriados IS 'Permite atualização de feriados para usuários autenticados';
COMMENT ON POLICY "feriados_delete_authenticated" ON feriados IS 'Permite exclusão de feriados para usuários autenticados';
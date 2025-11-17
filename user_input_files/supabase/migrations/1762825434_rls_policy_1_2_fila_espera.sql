-- Migration: rls_policy_1_2_fila_espera
-- Created at: 1762825434

-- Habilitar RLS na tabela fila_espera
ALTER TABLE fila_espera ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
CREATE POLICY "fila_espera_select_authenticated" ON fila_espera
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir INSERT para usuários autenticados
CREATE POLICY "fila_espera_insert_authenticated" ON fila_espera
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "fila_espera_update_authenticated" ON fila_espera
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir DELETE para usuários autenticados
CREATE POLICY "fila_espera_delete_authenticated" ON fila_espera
    FOR DELETE USING (auth.role() = 'authenticated');;
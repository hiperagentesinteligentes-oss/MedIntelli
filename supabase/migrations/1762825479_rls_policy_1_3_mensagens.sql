-- Migration: rls_policy_1_3_mensagens
-- Created at: 1762825479

-- Migration: rls_policy_1_3_mensagens
-- Created at: 1762804248
-- Objetivo: Habilitar Row Level Security na tabela mensagens

-- Habilitar RLS na tabela mensagens
ALTER TABLE mensagens_app_paciente ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários autenticados podem ver todas as mensagens
CREATE POLICY mensagens_select_authenticated ON mensagens_app_paciente 
FOR SELECT TO authenticated USING (true);

-- Política para INSERT - usuários autenticados podem inserir mensagens
CREATE POLICY mensagens_insert_authenticated ON mensagens_app_paciente 
FOR INSERT TO authenticated WITH CHECK (true);

-- Política para UPDATE - usuários autenticados podem atualizar mensagens
CREATE POLICY mensagens_update_authenticated ON mensagens_app_paciente 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Política para DELETE - usuários autenticados podem deletar mensagens
CREATE POLICY mensagens_delete_authenticated ON mensagens_app_paciente 
FOR DELETE TO authenticated USING (true);;
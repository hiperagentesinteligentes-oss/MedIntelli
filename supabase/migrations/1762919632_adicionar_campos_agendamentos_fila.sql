-- Migration: adicionar_campos_agendamentos_fila
-- Created at: 1762919632

-- ========================================
-- 5. ATUALIZAR TABELAS AGENDAMENTOS E FILA_ESPERA
-- ========================================

-- Verificar se agendamentos tem o campo tipo_consulta (deve ter)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='agendamentos' 
        AND column_name='tipo_consulta'
    ) THEN
        ALTER TABLE agendamentos 
        ADD COLUMN tipo_consulta VARCHAR(100);
        
        COMMENT ON COLUMN agendamentos.tipo_consulta IS 'Tipo de consulta (relacionado com tipos_consulta.nome)';
    END IF;
END$$;

-- Verificar se fila_espera tem o campo tipo_consulta (deve ter)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='fila_espera' 
        AND column_name='tipo_consulta'
    ) THEN
        ALTER TABLE fila_espera 
        ADD COLUMN tipo_consulta VARCHAR(100);
        
        COMMENT ON COLUMN fila_espera.tipo_consulta IS 'Tipo de consulta (relacionado com tipos_consulta.nome)';
    END IF;
END$$;;
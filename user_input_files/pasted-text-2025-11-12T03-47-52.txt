-- MedIntelli - Migrações de Banco de Dados
-- Data: 2025-11-12
-- Descrição: Adiciona campos convenio e tabela tipos_consulta

-- ========================================
-- 1. ADICIONAR CAMPO CONVENIO
-- ========================================

-- Adicionar campo convenio na tabela agendamentos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';

-- Adicionar campo convenio na tabela fila_espera
ALTER TABLE fila_espera 
ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';

-- Comentários nas colunas
COMMENT ON COLUMN agendamentos.convenio IS 'Tipo de convênio: PARTICULAR, UNIMED, UNIMED_UNIFACIL, CASSI, CABESP';
COMMENT ON COLUMN fila_espera.convenio IS 'Tipo de convênio: PARTICULAR, UNIMED, UNIMED_UNIFACIL, CASSI, CABESP';

-- ========================================
-- 2. CRIAR TABELA TIPOS_CONSULTA
-- ========================================

-- Criar tabela de tipos de consulta (se não existir)
CREATE TABLE IF NOT EXISTS tipos_consulta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  duracao_padrao_minutos INT DEFAULT 30,
  ativo BOOLEAN DEFAULT TRUE,
  cor VARCHAR(20) DEFAULT '#3B82F6',
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_tipos_consulta_nome ON tipos_consulta(nome);

-- Índice para filtrar apenas tipos ativos
CREATE INDEX IF NOT EXISTS idx_tipos_consulta_ativo ON tipos_consulta(ativo);

-- ========================================
-- 3. INSERIR TIPOS DE CONSULTA PADRÃO
-- ========================================

-- Inserir tipos de consulta padrão (se ainda não existirem)
INSERT INTO tipos_consulta (nome, descricao, duracao_padrao_minutos, cor, ordem) VALUES
('Consulta de Rotina', 'Consulta médica geral de acompanhamento', 30, '#3B82F6', 1),
('Primeira Consulta', 'Primeira consulta com o médico', 45, '#10B981', 2),
('Retorno', 'Consulta de retorno para acompanhamento', 20, '#6366F1', 3),
('Consulta de Emergência', 'Atendimento de emergência', 60, '#EF4444', 4),
('Check-up', 'Consulta de check-up geral', 45, '#8B5CF6', 5),
('Consulta de Seguimento', 'Consulta de seguimento de tratamento', 30, '#F59E0B', 6),
('Exame Clínico', 'Consulta para avaliação e exames', 30, '#06B6D4', 7),
('Consulta Pediátrica', 'Consulta para crianças', 30, '#EC4899', 8),
('Consulta Geriátrica', 'Consulta para idosos', 45, '#14B8A6', 9),
('Pré-operatório', 'Consulta pré-operatória', 30, '#F97316', 10)
ON CONFLICT (nome) DO NOTHING;

-- ========================================
-- 4. ATUALIZAR TRIGGER UPDATED_AT
-- ========================================

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para tipos_consulta
DROP TRIGGER IF EXISTS update_tipos_consulta_updated_at ON tipos_consulta;
CREATE TRIGGER update_tipos_consulta_updated_at
    BEFORE UPDATE ON tipos_consulta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. VERIFICAR SE TABELAS POSSUEM OS CAMPOS NECESSÁRIOS
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
END$$;

-- ========================================
-- 6. ENUM PARA CONVÊNIOS (OPCIONAL - MAIS SEGURO)
-- ========================================

-- Criar enum para convenios (opcional, mas recomendado para consistência)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'convenio_tipo') THEN
        CREATE TYPE convenio_tipo AS ENUM (
            'PARTICULAR',
            'UNIMED',
            'UNIMED_UNIFACIL',
            'CASSI',
            'CABESP',
            'OUTROS'
        );
    END IF;
END$$;

-- ========================================
-- 7. VERIFICAÇÕES FINAIS
-- ========================================

-- Verificar se todos os campos foram criados corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('agendamentos', 'fila_espera', 'tipos_consulta')
AND column_name IN ('convenio', 'tipo_consulta', 'nome', 'duracao_padrao_minutos')
ORDER BY table_name, column_name;

-- Contar tipos de consulta inseridos
SELECT COUNT(*) as total_tipos_consulta FROM tipos_consulta;

-- ========================================
-- ROLLBACK (SE NECESSÁRIO)
-- ========================================

/*
-- Para reverter as mudanças (caso necessário):

-- Remover campo convenio
ALTER TABLE agendamentos DROP COLUMN IF EXISTS convenio;
ALTER TABLE fila_espera DROP COLUMN IF EXISTS convenio;

-- Remover tabela tipos_consulta
DROP TABLE IF EXISTS tipos_consulta CASCADE;

-- Remover enum convenio_tipo
DROP TYPE IF EXISTS convenio_tipo CASCADE;

-- Remover trigger
DROP TRIGGER IF EXISTS update_tipos_consulta_updated_at ON tipos_consulta;
DROP FUNCTION IF EXISTS update_updated_at_column;
*/

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================

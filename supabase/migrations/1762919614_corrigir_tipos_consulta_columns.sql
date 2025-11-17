-- Migration: corrigir_tipos_consulta_columns
-- Created at: 1762919614

-- MedIntelli - Migrações de Banco de Dados (CORRIGIDO)
-- Data: 2025-11-12
-- Descrição: Adiciona campos convenio e tabela tipos_consulta (com correção de colunas)

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
-- 2. CRIAR/ATUALIZAR TABELA TIPOS_CONSULTA
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

-- Adicionar colunas em falta se a tabela já existir
DO $$
BEGIN
    -- Adicionar coluna descricao se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='descricao'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN descricao TEXT;
    END IF;
    
    -- Adicionar coluna duracao_padrao_minutos se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='duracao_padrao_minutos'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN duracao_padrao_minutos INT DEFAULT 30;
    END IF;
    
    -- Adicionar coluna ativo se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='ativo'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Adicionar coluna cor se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='cor'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN cor VARCHAR(20) DEFAULT '#3B82F6';
    END IF;
    
    -- Adicionar coluna ordem se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='ordem'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN ordem INT DEFAULT 0;
    END IF;
    
    -- Adicionar coluna updated_at se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='tipos_consulta' 
        AND column_name='updated_at'
    ) THEN
        ALTER TABLE tipos_consulta ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END$$;;
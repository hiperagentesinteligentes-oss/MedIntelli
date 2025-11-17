-- Migration: patch_v4_0_5_mensagens_table_corrected
-- Created at: 1762825370

-- Patch v4.0.5: Criar tabela mensagens (CORRIGIDO)
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    origem VARCHAR(20) NOT NULL CHECK (origem IN ('app', 'whatsapp')),
    tipo VARCHAR(100) NOT NULL,
    lida BOOLEAN DEFAULT false,
    prioridade VARCHAR(20) DEFAULT 'normal',
    detalhes JSONB,
    enviado_para VARCHAR(100),
    paciente_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para otimização
CREATE INDEX IF NOT EXISTS idx_mensagens_origem ON mensagens(origem);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens(lida);
CREATE INDEX IF NOT EXISTS idx_mensagens_paciente ON mensagens(paciente_id);;
-- Migration: patch_v4_0_5_mensagens_alter_existing
-- Created at: 1762825403

-- Patch v4.0.5: Alterar tabela mensagens existente para atender requisitos do Patch v4

-- Adicionar novas colunas necessárias
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS origem VARCHAR(20) CHECK (origem IN ('app', 'whatsapp'));
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS tipo VARCHAR(100) NOT NULL DEFAULT 'sistema';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'normal';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS detalhes JSONB;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS enviado_para VARCHAR(100);
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS paciente_id UUID;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_mensagens_origem ON mensagens(origem);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens(lida);
CREATE INDEX IF NOT EXISTS idx_mensagens_paciente ON mensagens(paciente_id);;
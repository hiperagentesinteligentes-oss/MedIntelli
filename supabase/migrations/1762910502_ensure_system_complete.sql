-- Migration: ensure_system_complete
-- Created at: 1762910502

-- Migration para garantir sistema completo restaurado
-- Data: 2025-11-12

-- 1. Views para mensagens não lidas (conforme especificação do restore)
DO $$
BEGIN
    -- Remover views existentes se existirem
    DROP VIEW IF EXISTS vw_unread_app;
    DROP VIEW IF EXISTS vw_unread_whats;
    DROP VIEW IF EXISTS msg_nao_lidas;
    DROP VIEW IF EXISTS whats_nao_lidas;
    
    -- Criar view para mensagens do app não lidas
    CREATE OR REPLACE VIEW vw_unread_app AS
    SELECT paciente_id, count(*)::int as nao_lidas
    FROM app_messages
    WHERE coalesce(lida, false) = false
    GROUP BY paciente_id;
    
    -- Criar view para mensagens WhatsApp
    CREATE OR REPLACE VIEW vw_unread_whats AS
    SELECT paciente_id, count(*)::int as nao_lidas
    FROM whatsapp_messages
    WHERE coalesce(status_envio, 'pendente') IN ('enviado', 'entregue')
      AND coalesce(lida, false) = false
    GROUP BY paciente_id;
    
    -- Views alternativas para compatibilidade
    CREATE OR REPLACE VIEW msg_nao_lidas AS
    SELECT paciente_id, count(*)::int as nao_lidas
    FROM app_messages
    WHERE coalesce(lida, false) = false
    GROUP BY paciente_id;
    
    CREATE OR REPLACE VIEW whats_nao_lidas AS
    SELECT paciente_id, count(*)::int as nao_lidas
    FROM whatsapp_messages
    WHERE coalesce(status_envio, 'pendente') IN ('enviado', 'entregue')
      AND coalesce(lida, false) = false
    GROUP BY paciente_id;
    
    RAISE NOTICE 'Views de mensagens não lidas criadas com sucesso';
END $$;

-- 2. Garantir que a tabela ia_contextos existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_contextos') THEN
        CREATE TABLE ia_contextos (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
            origem text CHECK (origem IN ('app','whatsapp')),
            contexto jsonb,
            atualizado_em timestamp DEFAULT now()
        );
        RAISE NOTICE 'Tabela ia_contextos criada';
    ELSE
        RAISE NOTICE 'Tabela ia_contextos já existe';
    END IF;
END $$;

-- 3. Garantir que a tabela app_messages existe com colunas corretas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_messages') THEN
        CREATE TABLE app_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            paciente_id uuid REFERENCES pacientes(id) ON DELETE SET NULL,
            conteudo text NOT NULL,
            lida boolean DEFAULT false,
            origem text DEFAULT 'app',
            created_at timestamp DEFAULT now()
        );
        RAISE NOTICE 'Tabela app_messages criada';
    ELSE
        -- Garantir que as colunas necessárias existem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'app_messages' AND column_name = 'lida') THEN
            ALTER TABLE app_messages ADD COLUMN lida boolean DEFAULT false;
            RAISE NOTICE 'Coluna lida adicionada à tabela app_messages';
        END IF;
    END IF;
END $$;

-- 4. Garantir que a tabela whatsapp_messages existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_messages') THEN
        CREATE TABLE whatsapp_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            paciente_id uuid REFERENCES pacientes(id) ON DELETE SET NULL,
            categoria text NOT NULL DEFAULT 'geral',
            tipo text NOT NULL DEFAULT 'informacao',
            conteudo text NOT NULL,
            template_id text,
            destinatario_telefone text NOT NULL,
            status_envio text DEFAULT 'pendente',
            mensagem_origem text DEFAULT 'sistema',
            data_agendamento timestamp,
            lida boolean DEFAULT false,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
        );
        RAISE NOTICE 'Tabela whatsapp_messages criada';
    ELSE
        -- Garantir que as colunas necessárias existem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'whatsapp_messages' AND column_name = 'lida') THEN
            ALTER TABLE whatsapp_messages ADD COLUMN lida boolean DEFAULT false;
            RAISE NOTICE 'Coluna lida adicionada à tabela whatsapp_messages';
        END IF;
    END IF;
END $$;

-- 5. Insert de usuários iniciais (conforme especificação)
DO $$
BEGIN
    INSERT INTO usuarios (nome, email, perfil, ativo) VALUES
    ('Alencar','alencar@medintelli.com.br','Admin',true),
    ('Silvia','silvia@medintelli.com.br','Admin',true),
    ('Gabriel','gabriel@medintelli.com.br','Auxiliar',true),
    ('Natashia','natashia@medintelli.com.br','Secretaria',true),
    ('Dr. Francisco','drfrancisco@medintelli.com.br','Medico',true)
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Usuários iniciais inseridos (conflitos ignorados)';
END $$;

-- 6. Garantir índices necessários para performance
DO $$
BEGIN
    -- Índices para agendamentos
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agendamentos_data_agendamento') THEN
        CREATE INDEX idx_agendamentos_data_agendamento ON agendamentos(data_agendamento);
        RAISE NOTICE 'Índice idx_agendamentos_data_agendamento criado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agendamentos_status') THEN
        CREATE INDEX idx_agendamentos_status ON agendamentos(status);
        RAISE NOTICE 'Índice idx_agendamentos_status criado';
    END IF;
    
    -- Índices para pacientes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pacientes_nome') THEN
        CREATE INDEX idx_pacientes_nome ON pacientes USING gin (to_tsvector('portuguese', coalesce(nome,'')));
        RAISE NOTICE 'Índice idx_pacientes_nome criado';
    END IF;
END $$;

RAISE NOTICE 'Sistema restaurado com sucesso! Todas as funcionalidades estão disponíveis.';;
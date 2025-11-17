-- Migration: system_essentials
-- Created at: 1762910554

-- Garantir que as funcionalidades essenciais existem

-- Insert de usuários iniciais (conforme especificação)
INSERT INTO usuarios (nome, email, perfil, ativo) VALUES
('Alencar','alencar@medintelli.com.br','Admin',true),
('Silvia','silvia@medintelli.com.br','Admin',true),
('Gabriel','gabriel@medintelli.com.br','Auxiliar',true),
('Natashia','natashia@medintelli.com.br','Secretaria',true),
('Dr. Francisco','drfrancisco@medintelli.com.br','Medico',true)
ON CONFLICT (email) DO NOTHING;;
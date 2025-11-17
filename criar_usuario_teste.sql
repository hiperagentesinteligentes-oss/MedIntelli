-- Criar usuário de teste no auth.users
-- IMPORTANTE: Execute via Supabase Dashboard SQL Editor

-- 1. Primeiro, inserir usuário no auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'paciente.teste@medintelli.com.br',
  crypt('Paciente123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
);

-- 2. Inserir perfil na tabela pacientes
INSERT INTO pacientes (
  profile_id,
  nome,
  email,
  telefone,
  ativo
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Maria Silva Teste',
  'paciente.teste@medintelli.com.br',
  '(11) 98765-4321',
  true
);

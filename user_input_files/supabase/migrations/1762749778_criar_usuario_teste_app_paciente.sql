-- Migration: criar_usuario_teste_app_paciente
-- Created at: 1762749778


-- Criar usuário de teste para APP Paciente
DO $$
DECLARE
  v_user_id UUID := 'b0000000-0000-0000-0000-000000000001';
  v_encrypted_password TEXT;
BEGIN
  -- Gerar hash da senha
  v_encrypted_password := crypt('Paciente123!', gen_salt('bf'));
  
  -- Verificar se usuário já existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    -- Inserir usuário no auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'maria.teste@medintelli.com.br',
      v_encrypted_password,
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      ''
    );
    
    -- Inserir identidade
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'maria.teste@medintelli.com.br'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  
  -- Verificar se paciente já existe
  IF NOT EXISTS (SELECT 1 FROM pacientes WHERE profile_id = v_user_id) THEN
    -- Inserir paciente
    INSERT INTO pacientes (
      profile_id,
      nome,
      email,
      telefone,
      ativo,
      data_nascimento,
      cpf
    ) VALUES (
      v_user_id,
      'Maria Silva Teste',
      'maria.teste@medintelli.com.br',
      '(11) 98765-4321',
      true,
      '1990-05-15',
      '123.456.789-00'
    );
  END IF;
  
END $$;
;
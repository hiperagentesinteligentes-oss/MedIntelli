-- Migration: criar_perfil_gabriel
-- Created at: 1762892962

-- Criar perfil para Gabriel (assumindo que ja existe no Supabase Auth)
-- Se nao existir, a edge function criara

INSERT INTO user_profiles (user_id, email, nome, role, ativo)
SELECT 
  '3c97fb3e-dd1a-4193-b212-204dfb4d6360'::uuid,
  'gabriel@medintelli.com.br',
  'Gabriel',
  'auxiliar',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE email = 'gabriel@medintelli.com.br'
);
;
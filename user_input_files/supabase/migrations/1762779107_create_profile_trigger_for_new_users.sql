-- Migration: create_profile_trigger_for_new_users
-- Created at: 1762779107

-- Função para criar perfil automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, ativo, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    true,
    'paciente'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após INSERT na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();;
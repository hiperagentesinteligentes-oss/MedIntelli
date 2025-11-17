// Edge Function para criar usuario Gabriel
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Criar Gabriel
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'gabriel@medintelli.com.br',
      password: 'senha123',
      email_confirm: true
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }

    const userId = signUpData?.user?.id || 'existing-user-id';

    // Criar perfil
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        email: 'gabriel@medintelli.com.br',
        nome: 'Gabriel',
        role: 'auxiliar',
        ativo: true
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        sucesso: true,
        userId: userId,
        profile: profileData,
        profileError: profileError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ erro: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

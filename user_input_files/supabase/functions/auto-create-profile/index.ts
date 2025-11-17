Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const { user_id, email, name } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'user_id e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar se perfil já existe
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${user_id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: existing[0],
          message: 'Perfil já existe' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar novo perfil com role padrão
    const profileData = {
      user_id: user_id,
      email: email,
      nome: name || email.split('@')[0],
      role: 'secretaria', // Role padrão para novos usuários
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(profileData),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Erro ao criar perfil: ${errorText}`);
    }

    const newProfile = await createResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: Array.isArray(newProfile) ? newProfile[0] : newProfile,
        message: 'Perfil criado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

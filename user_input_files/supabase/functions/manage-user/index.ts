Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configurações do Supabase não encontradas');
    }
    
    const { action, userData } = await req.json();
    
    if (!action || !userData) {
      throw new Error('Ação e dados do usuário são obrigatórios');
    }

    // Criar usuário
    if (action === 'create') {
      const { email, password, nome, telefone, role } = userData;
      
      if (!email || !password || !nome || !role) {
        throw new Error('Email, senha, nome e role são obrigatórios');
      }

      // Criar usuário no Auth
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nome,
            role,
          }
        })
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || `Erro ao criar usuário: ${error.error_description || 'Erro desconhecido'}`);
      }

      const authUser = await authResponse.json();

      // Criar perfil no user_profiles
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: authUser.id,
          email,
          nome,
          telefone: telefone || null,
          role,
          ativo: true,
        })
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        // Se falhou ao criar perfil, deletar o usuário Auth
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            }
          });
        } catch (cleanupError) {
          console.error('Erro ao deletar usuário após falha no perfil:', cleanupError);
        }
        throw new Error(`Erro ao criar perfil: ${error.message || error.error_description || 'Erro desconhecido'}`);
      }

      const profile = await profileResponse.json();

      return new Response(JSON.stringify({ 
        success: true, 
        data: profile[0] || profile 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Atualizar usuário
    if (action === 'update') {
      const { userId, email, nome, telefone, role, password } = userData;
      
      if (!userId) {
        throw new Error('ID do usuário é obrigatório');
      }

      // Atualizar usuário no Auth se necessário (senha ou email)
      if (password || email) {
        const updateData: any = {};
        if (password) updateData.password = password;
        if (email) updateData.email = email;

        const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify(updateData)
        });

        if (!authResponse.ok) {
          const error = await authResponse.json();
          throw new Error(`Erro ao atualizar usuário no Auth: ${error.message || error.error_description || 'Erro desconhecido'}`);
        }
      }

      // Atualizar perfil no user_profiles
      const updateProfile: any = {};
      if (nome) updateProfile.nome = nome;
      if (email) updateProfile.email = email;
      if (telefone !== undefined) updateProfile.telefone = telefone;
      if (role) updateProfile.role = role;

      if (Object.keys(updateProfile).length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateProfile)
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        throw new Error(`Erro ao atualizar perfil: ${error.message || error.error_description || 'Erro desconhecido'}`);
      }

      const profile = await profileResponse.json();

      return new Response(JSON.stringify({ 
        success: true, 
        data: profile[0] || profile 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    throw new Error('Ação inválida. Use "create" ou "update"');

  } catch (error) {
    console.error('Erro na manage-user function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro ao processar requisição'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
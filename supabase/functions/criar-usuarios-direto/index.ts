// Edge Function para criar usuarios SEM listar (evitar erro de permissao)
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

    const resultados = [];

    // CRIAR USUARIOS DIRETAMENTE (sem verificar se existem)
    const usuarios = [
      { email: 'silvia@medintelli.com.br', nome: 'Silvia', role: 'administrador' },
      { email: 'gabriel@medintelli.com.br', nome: 'Gabriel', role: 'auxiliar' }
    ];

    for (const usuario of usuarios) {
      try {
        console.log(`Tentando criar ${usuario.email}...`);
        
        // Tentar criar usuario
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: usuario.email,
          password: 'senha123',
          email_confirm: true
        });

        let userId = null;
        let acao = 'criado';

        if (createError) {
          // Se erro for "user already exists", tentar fazer signInWithPassword para pegar o ID
          if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
            console.log(`${usuario.email} ja existe, tentando login para obter ID...`);
            
            const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
              email: usuario.email,
              password: 'senha123'
            });

            if (!signInError && signInData.user) {
              userId = signInData.user.id;
              acao = 'atualizado';
              
              // Atualizar senha para garantir
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: 'senha123'
              });
            } else {
              throw new Error(`Usuario existe mas nao consegui obter ID: ${signInError?.message}`);
            }
          } else {
            throw createError;
          }
        } else {
          userId = userData.user.id;
        }

        if (!userId) {
          throw new Error('Nao foi possivel obter user_id');
        }

        // Criar/atualizar perfil
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            user_id: userId,
            email: usuario.email,
            nome: usuario.nome,
            role: usuario.role,
            ativo: true
          }, { onConflict: 'user_id' });

        resultados.push({
          usuario: usuario.nome,
          email: usuario.email,
          status: 'sucesso',
          acao: acao,
          user_id: userId,
          profileError: profileError?.message || null
        });

      } catch (error) {
        console.error(`Erro ao processar ${usuario.email}:`, error);
        resultados.push({
          usuario: usuario.nome,
          email: usuario.email,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Processamento concluido',
        resultados: resultados
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        erro: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

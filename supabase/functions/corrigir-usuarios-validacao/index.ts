// Edge Function para corrigir usuarios Silvia e Gabriel
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

    // 1. CORRIGIR SILVIA - Deletar e recriar
    try {
      console.log('Processando Silvia...');
      
      // Buscar usuario existente
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const silviaUser = existingUsers?.users?.find(u => u.email === 'silvia@medintelli.com.br');
      
      if (silviaUser) {
        console.log('Deletando usuario Silvia existente:', silviaUser.id);
        await supabaseAdmin.auth.admin.deleteUser(silviaUser.id);
      }
      
      // Criar novo usuario
      console.log('Criando novo usuario Silvia...');
      const { data: newSilvia, error: silviaError } = await supabaseAdmin.auth.admin.createUser({
        email: 'silvia@medintelli.com.br',
        password: 'senha123',
        email_confirm: true
      });

      if (silviaError) throw silviaError;
      
      // Atualizar perfil
      const { error: profileError1 } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: newSilvia.user.id,
          email: 'silvia@medintelli.com.br',
          nome: 'Silvia',
          role: 'administrador',
          ativo: true
        }, { onConflict: 'user_id' });

      resultados.push({
        usuario: 'Silvia',
        status: 'sucesso',
        user_id: newSilvia.user.id,
        profileError: profileError1?.message || null
      });
      
    } catch (error) {
      console.error('Erro ao processar Silvia:', error);
      resultados.push({
        usuario: 'Silvia',
        status: 'erro',
        erro: error.message
      });
    }

    // 2. CRIAR GABRIEL
    try {
      console.log('Processando Gabriel...');
      
      // Verificar se existe
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const gabrielUser = existingUsers?.users?.find(u => u.email === 'gabriel@medintelli.com.br');
      
      let gabrielUserId;
      
      if (gabrielUser) {
        console.log('Gabriel ja existe, atualizando senha...');
        await supabaseAdmin.auth.admin.updateUserById(gabrielUser.id, {
          password: 'senha123'
        });
        gabrielUserId = gabrielUser.id;
      } else {
        console.log('Criando novo usuario Gabriel...');
        const { data: newGabriel, error: gabrielError } = await supabaseAdmin.auth.admin.createUser({
          email: 'gabriel@medintelli.com.br',
          password: 'senha123',
          email_confirm: true
        });

        if (gabrielError) throw gabrielError;
        gabrielUserId = newGabriel.user.id;
      }
      
      // Criar/atualizar perfil
      const { error: profileError2 } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: gabrielUserId,
          email: 'gabriel@medintelli.com.br',
          nome: 'Gabriel',
          role: 'auxiliar',
          ativo: true
        }, { onConflict: 'user_id' });

      resultados.push({
        usuario: 'Gabriel',
        status: 'sucesso',
        user_id: gabrielUserId,
        profileError: profileError2?.message || null
      });
      
    } catch (error) {
      console.error('Erro ao processar Gabriel:', error);
      resultados.push({
        usuario: 'Gabriel',
        status: 'erro',
        erro: error.message
      });
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Usuarios processados',
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

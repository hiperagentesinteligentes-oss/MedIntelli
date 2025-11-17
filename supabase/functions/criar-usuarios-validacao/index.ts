// Edge Function para criar usuarios de teste no Supabase Auth
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Usuario {
  email: string;
  senha: string;
  nome: string;
  perfil: 'super_admin' | 'administrador' | 'medico' | 'secretaria' | 'auxiliar';
}

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

    // Usuarios de teste para validacao
    const usuarios: Usuario[] = [
      { email: 'alencar@medintelli.com.br', senha: 'senha123', nome: 'Alencar', perfil: 'administrador' },
      { email: 'silvia@medintelli.com.br', senha: 'senha123', nome: 'Silvia', perfil: 'administrador' },
      { email: 'gabriel@medintelli.com.br', senha: 'senha123', nome: 'Gabriel', perfil: 'auxiliar' },
      { email: 'natashia@medintelli.com.br', senha: 'senha123', nome: 'Natashia', perfil: 'secretaria' },
      { email: 'drfrancisco@medintelli.com.br', senha: 'senha123', nome: 'Dr. Francisco', perfil: 'medico' },
    ];

    const resultados = [];

    for (const usuario of usuarios) {
      try {
        // Verificar se usuario ja existe
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users?.find(u => u.email === usuario.email);

        let userId: string;

        if (userExists) {
          console.log(`Usuario ${usuario.email} ja existe, atualizando senha...`);
          // Atualizar senha do usuario existente
          const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userExists.id,
            { password: usuario.senha }
          );
          
          if (updateError) throw updateError;
          userId = userExists.id;
          
          resultados.push({
            email: usuario.email,
            acao: 'atualizado',
            userId: userId
          });
        } else {
          console.log(`Criando usuario ${usuario.email}...`);
          // Criar novo usuario
          const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
            email: usuario.email,
            password: usuario.senha,
            email_confirm: true
          });

          if (signUpError) throw signUpError;
          userId = signUpData.user.id;
          
          resultados.push({
            email: usuario.email,
            acao: 'criado',
            userId: userId
          });
        }

        // Criar ou atualizar perfil em user_profiles
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            user_id: userId,
            email: usuario.email,
            nome: usuario.nome,
            role: usuario.perfil,
            ativo: true
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (profileError) {
          console.error(`Erro ao criar perfil para ${usuario.email}:`, profileError);
          resultados[resultados.length - 1].profileError = profileError.message;
        } else {
          resultados[resultados.length - 1].profile = 'criado';
        }

      } catch (error) {
        console.error(`Erro ao processar ${usuario.email}:`, error);
        resultados.push({
          email: usuario.email,
          erro: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Usuarios de validacao processados',
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
        erro: error.message,
        detalhes: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

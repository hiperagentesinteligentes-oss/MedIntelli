// Edge Function para resetar senhas de Silvia e Gabriel
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

    // IDs conhecidos
    const usuarios = [
      { id: '26c40b5a-5864-4b22-ad37-9ee2bca53d20', email: 'silvia@medintelli.com.br', nome: 'Silvia' },
      { id: '7d962bb3-7f9b-49b5-b970-4aeedbc12f47', email: 'gabriel@medintelli.com.br', nome: 'Gabriel' }
    ];

    for (const usuario of usuarios) {
      try {
        // Resetar senha usando updateUserById (não requer listagem)
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          usuario.id,
          { password: 'senha123' }
        );

        if (error) throw error;

        resultados.push({
          usuario: usuario.nome,
          email: usuario.email,
          status: 'sucesso',
          mensagem: 'Senha atualizada para senha123'
        });

      } catch (error) {
        console.error(`Erro ao resetar ${usuario.email}:`, error);
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
        mensagem: 'Senhas resetadas',
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
      JSON.stringify({ erro: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { action, filtro } = await req.json();

    if (action === 'listar_mensagens') {
      // Buscar mensagens do app paciente
      let queryApp = `${supabaseUrl}/rest/v1/mensagens_app_paciente?select=*,pacientes(nome,telefone,email)&order=data_criacao.desc`;
      
      if (filtro?.paciente_nome) {
        queryApp += `&pacientes.nome=ilike.*${filtro.paciente_nome}*`;
      }
      if (filtro?.status) {
        queryApp += `&status=eq.${filtro.status}`;
      }

      const appResponse = await fetch(queryApp, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      });

      if (!appResponse.ok) {
        throw new Error('Erro ao buscar mensagens do app');
      }

      const mensagensApp = await appResponse.json();

      // Buscar mensagens do WhatsApp
      let queryWhats = `${supabaseUrl}/rest/v1/whatsapp_messages?select=*&order=timestamp.desc.nullslast,sent_at.desc.nullslast&limit=100`;

      const whatsResponse = await fetch(queryWhats, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      });

      if (!whatsResponse.ok) {
        throw new Error('Erro ao buscar mensagens do WhatsApp');
      }

      const mensagensWhats = await whatsResponse.json();

      // Buscar todos os pacientes
      const pacientesResponse = await fetch(`${supabaseUrl}/rest/v1/pacientes?select=*`, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        }
      });

      const pacientes = await pacientesResponse.json();

      return new Response(JSON.stringify({
        success: true,
        data: {
          mensagensApp,
          mensagensWhats,
          pacientes,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (action === 'responder_mensagem') {
      const { mensagem_id, resposta, tipo } = await req.json();

      if (tipo === 'app') {
        // Atualizar mensagem do app
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/mensagens_app_paciente?id=eq.${mensagem_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            status: 'respondida',
            data_resposta: new Date().toISOString(),
            encaminhamento_comentario: resposta,
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Erro ao atualizar mensagem');
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Mensagem respondida com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Tipo de mensagem não suportado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (action === 'encaminhar_mensagem') {
      const { mensagem_id, destino, tipo } = await req.json();

      if (tipo === 'app') {
        // Atualizar mensagem do app
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/mensagens_app_paciente?id=eq.${mensagem_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            status: 'encaminhada',
            respondido_por: destino,
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Erro ao encaminhar mensagem');
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Mensagem encaminhada com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Tipo de mensagem não suportado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    throw new Error('Ação inválida');

  } catch (error) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao processar requisição'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});

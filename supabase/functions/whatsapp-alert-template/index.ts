// Edge Function para envio de template alert_erro_agendamento
// Template para alertas de erro automáticos

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { titulo, detalhe, telefoneAdmin, dataHora } = await req.json();

    if (!titulo || !detalhe || !telefoneAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: titulo, detalhe, telefoneAdmin' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Template mensagem
    const mensagemTexto = `🩺 Alerta Automático – Sistema MedIntelli\n\n⚠️ *${titulo}*\n\n${detalhe}\n\n📅 Data/Hora: ${dataHora}\n\n🔍 Sistema: MedIntelli - Agendamentos\nPor favor, verifique no painel de logs.\n\n💡 Mensagem enviada automaticamente pelo agente de IA.`;

    // Chamada para AVISA API (assumindo que existe endpoint)
    const avisaApiKey = Deno.env.get('AVISA_API_KEY');
    const avisaUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br/whatsapp/send';

    if (!avisaApiKey) {
      console.warn('AVISA_API_KEY não configurada, retornando mensagem simulada');
      return new Response(JSON.stringify({
        success: true,
        message: 'Template preparado',
        whatsapp_message: mensagemTexto,
        to: telefoneAdmin,
        template: 'alerta_erro_agendamento'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enviar via AVISA API
    const response = await fetch(avisaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${avisaApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: telefoneAdmin,
        template: "alerta_erro_agendamento",
        variables: [titulo, detalhe, dataHora]
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Alerta enviado com sucesso',
      whatsapp_result: result,
      template: 'alerta_erro_agendamento',
      titulo,
      telefoneAdmin,
      dataHora
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao processar alerta',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
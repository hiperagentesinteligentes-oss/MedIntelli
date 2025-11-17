// Edge Function para envio de template cancelamento_consulta
// Template para cancelamentos de consultas

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
    const { 
      nomePaciente, 
      dataConsulta, 
      horarioConsulta, 
      especialidade, 
      profissional,
      telefonePaciente,
      motivoCancelamento,
      tipoCancelamento = 'paciente' // 'paciente' ou 'consultorio'
    } = await req.json();

    if (!nomePaciente || !dataConsulta || !horarioConsulta || !telefonePaciente || !motivoCancelamento) {
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: nomePaciente, dataConsulta, horarioConsulta, telefonePaciente, motivoCancelamento' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Template variáveis
    const mensagemTexto = `❌ Cancelamento de Consulta – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nSua consulta marcada para o dia *${dataConsulta}* às *${horarioConsulta}* foi *cancelada*.\n\n🧠 Motivo: ${motivoCancelamento}\n\nSe desejar, podemos reagendar para uma nova data.\nBasta responder com *Reagendar* para receber novas opções de horários.\n\nAgradecemos sua compreensão e continuamos à disposição.\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

    const avisaApiKey = Deno.env.get('AVISA_API_KEY');
    const avisaUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br/whatsapp/send';

    if (!avisaApiKey) {
      console.warn('AVISA_API_KEY não configurada, retornando mensagem simulada');
      return new Response(JSON.stringify({
        success: true,
        message: 'Template de cancelamento preparado',
        whatsapp_message: mensagemTexto,
        to: telefonePaciente,
        template: 'cancelamento_consulta',
        variables: [nomePaciente, dataConsulta, horarioConsulta, motivoCancelamento],
        tipo_cancelamento: tipoCancelamento
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
        to: telefonePaciente,
        template: "cancelamento_consulta",
        variables: [
          nomePaciente,
          dataConsulta,
          horarioConsulta,
          motivoCancelamento
        ],
        tipo_cancelamento: tipoCancelamento
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Cancelamento comunicado com sucesso',
      whatsapp_result: result,
      template: 'cancelamento_consulta',
      paciente: nomePaciente,
      consulta_cancelada: `${dataConsulta} às ${horarioConsulta}`,
      motivo: motivoCancelamento,
      tipo_cancelamento: tipoCancelamento,
      to: telefonePaciente
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao enviar cancelamento:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao processar cancelamento',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
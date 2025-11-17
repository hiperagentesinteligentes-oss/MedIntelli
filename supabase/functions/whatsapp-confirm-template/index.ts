// Edge Function para envio de template confirmacao_agendamento
// Template para confirmação de agendamentos

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
      motivo 
    } = await req.json();

    if (!nomePaciente || !dataConsulta || !horarioConsulta || !telefonePaciente) {
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: nomePaciente, dataConsulta, horarioConsulta, telefonePaciente' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Template variáveis
    const mensagemTexto = `📅 Confirmação de Agendamento – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nSeu agendamento foi *recebido* para o dia *${dataConsulta}* às *${horarioConsulta}*.\n\n📍 Local: Clínica MedIntelli\n🧠 Especialidade: ${especialidade || motivo || 'Consulta de rotina'}\n👩‍⚕️ Profissional: ${profissional || 'Dr. Francisco'}\n\nPor favor, confirme sua presença respondendo com *Sim* ou *Não*.\n\nEm caso de dúvidas, entre em contato conosco pelo WhatsApp.\nAgradecemos a confiança!\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

    const avisaApiKey = Deno.env.get('AVISA_API_KEY');
    const avisaUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br/whatsapp/send';

    if (!avisaApiKey) {
      console.warn('AVISA_API_KEY não configurada, retornando mensagem simulada');
      return new Response(JSON.stringify({
        success: true,
        message: 'Template de confirmação preparado',
        whatsapp_message: mensagemTexto,
        to: telefonePaciente,
        template: 'confirmacao_agendamento',
        variables: [nomePaciente, dataConsulta, horarioConsulta, especialidade || motivo, profissional || 'Dr. Francisco']
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
        template: "confirmacao_agendamento",
        variables: [
          nomePaciente,
          dataConsulta,
          horarioConsulta,
          especialidade || motivo || 'Consulta de rotina',
          profissional || 'Dr. Francisco'
        ]
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Confirmação enviada com sucesso',
      whatsapp_result: result,
      template: 'confirmacao_agendamento',
      paciente: nomePaciente,
      consulta: `${dataConsulta} às ${horarioConsulta}`,
      to: telefonePaciente
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao enviar confirmação:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao processar confirmação',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
// Edge Function para envio de template lembrete_consulta
// Template para lembretes de consultas

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
      motivo,
      minutosAntecedencia = 1440 // 24 horas por padrão
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
    const antecedencia = minutosAntecedencia === 1440 ? 'amanhã' : `${minutosAntecedencia} minutos antes`;
    const mensagemTexto = `⏰ Lembrete de Consulta – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nLembramos que você tem uma *consulta agendada* para *${antecedencia}*, dia *${dataConsulta}* às *${horarioConsulta}*.\n\n📍 Local: Clínica MedIntelli\n🧠 Especialidade: ${especialidade || motivo || 'Consulta de rotina'}\n👩‍⚕️ Profissional: ${profissional || 'Dr. Francisco'}\n\nPor favor, confirme sua presença respondendo com *Sim* ou *Não*.\nSe precisar reagendar, responda com *Reagendar*.\n\nAgradecemos sua pontualidade!\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

    const avisaApiKey = Deno.env.get('AVISA_API_KEY');
    const avisaUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br/whatsapp/send';

    if (!avisaApiKey) {
      console.warn('AVISA_API_KEY não configurada, retornando mensagem simulada');
      return new Response(JSON.stringify({
        success: true,
        message: 'Template de lembrete preparado',
        whatsapp_message: mensagemTexto,
        to: telefonePaciente,
        template: 'lembrete_consulta',
        variables: [nomePaciente, dataConsulta, horarioConsulta, especialidade || motivo, profissional || 'Dr. Francisco'],
        antecedencia_minutos: minutosAntecedencia
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
        template: "lembrete_consulta",
        variables: [
          nomePaciente,
          dataConsulta,
          horarioConsulta,
          especialidade || motivo || 'Consulta de rotina',
          profissional || 'Dr. Francisco'
        ],
        antecedencia_minutos: minutosAntecedencia
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Lembrete enviado com sucesso',
      whatsapp_result: result,
      template: 'lembrete_consulta',
      paciente: nomePaciente,
      consulta: `${dataConsulta} às ${horarioConsulta}`,
      antecedencia_minutos: minutosAntecedencia,
      to: telefonePaciente
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao enviar lembrete:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao processar lembrete',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
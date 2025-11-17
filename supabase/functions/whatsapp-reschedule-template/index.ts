// Edge Function para envio de template reagendamento_consulta
// Template para reagendamentos de consultas

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
      novaDataConsulta, 
      novoHorarioConsulta, 
      especialidade, 
      profissional,
      telefonePaciente,
      motivo,
      motivoReagendamento 
    } = await req.json();

    if (!nomePaciente || !novaDataConsulta || !novoHorarioConsulta || !telefonePaciente) {
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: nomePaciente, novaDataConsulta, novoHorarioConsulta, telefonePaciente' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Template variáveis
    const mensagemTexto = `🗓️ Reagendamento de Consulta – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nInformamos que sua consulta precisou ser *reagendada*.\n\nO novo horário sugerido é para o dia *${novaDataConsulta}* às *${novoHorarioConsulta}*.\n\n📍 Local: Clínica MedIntelli\n🧠 Especialidade: ${especialidade || motivo || 'Consulta de rotina'}\n👩‍⚕️ Profissional: ${profissional || 'Dr. Francisco'}\n\nPor favor, confirme se este novo horário está bom para você respondendo com *Sim* ou *Não*.\n\nAgradecemos sua compreensão e permanecemos à disposição.\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

    const avisaApiKey = Deno.env.get('AVISA_API_KEY');
    const avisaUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br/whatsapp/send';

    if (!avisaApiKey) {
      console.warn('AVISA_API_KEY não configurada, retornando mensagem simulada');
      return new Response(JSON.stringify({
        success: true,
        message: 'Template de reagendamento preparado',
        whatsapp_message: mensagemTexto,
        to: telefonePaciente,
        template: 'reagendamento_consulta',
        variables: [nomePaciente, novaDataConsulta, novoHorarioConsulta, especialidade || motivo, profissional || 'Dr. Francisco'],
        motivo_reagendamento: motivoReagendamento
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
        template: "reagendamento_consulta",
        variables: [
          nomePaciente,
          novaDataConsulta,
          novoHorarioConsulta,
          especialidade || motivo || 'Consulta de rotina',
          profissional || 'Dr. Francisco'
        ],
        motivo_reagendamento: motivoReagendamento
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Reagendamento comunicado com sucesso',
      whatsapp_result: result,
      template: 'reagendamento_consulta',
      paciente: nomePaciente,
      novo_horario: `${novaDataConsulta} às ${novoHorarioConsulta}`,
      motivo_reagendamento: motivoReagendamento,
      to: telefonePaciente
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao enviar reagendamento:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao processar reagendamento',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { mensagem, paciente_id, origem = 'app' } = await req.json();

    if (!mensagem) {
      throw new Error('Mensagem é obrigatória');
    }

    // 1. Buscar contexto anterior da conversa
    let contextoAtual = {
      etapa: 'inicial',
      dados_agendamento: {},
      historico_conversa: []
    };

    if (paciente_id) {
      const contextoResponse = await fetch(
        `${supabaseUrl}/rest/v1/ia_contextos?paciente_id=eq.${paciente_id}&status=eq.ativo&order=atualizado_em.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );

      if (contextoResponse.ok) {
        const contextoData = await contextoResponse.json();
        if (contextoData.length > 0) {
          contextoAtual = contextoData[0].contexto;
        }
      }
    }

    // 2. Buscar Base Única de Conhecimento (BUC) mais recente
    const bucResponse = await fetch(
      `${supabaseUrl}/rest/v1/buc_versoes?select=content&order=version.desc&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      }
    );

    let BUC = `Você é o assistente virtual da clínica MedIntelli, especializado em atendimento e triagem de pacientes.`;
    
    if (bucResponse.ok) {
      const bucData = await bucResponse.json();
      if (bucData.length > 0) {
        BUC = bucData[0].content;
      }
    }

    // 3. Adicionar contexto da conversa ao histórico
    contextoAtual.historico_conversa.push({
      tipo: 'paciente',
      mensagem: mensagem,
      timestamp: new Date().toISOString()
    });

    // 4. Gerar resposta conversacional com contexto
    const systemPrompt = `${BUC}

CONTEXTO DA CONVERSA ATUAL:
- Etapa: ${contextoAtual.etapa}
- Dados coletados: ${JSON.stringify(contextoAtual.dados_agendamento)}
- Histórico: ${contextoAtual.historico_conversa.map(h => `${h.tipo}: ${h.mensagem}`).join('\n')}

INSTRUÇÕES PARA CONVERSA CONTÍNUA:
1. FUNCÃO: Acompanhar o paciente até o fim do atendimento
2. FLUXO: Uma pergunta → uma resposta até completar
3. ETAPAS: cumprimentar → identificar → coletar dados → confirmar → encerrar
4. AÇÕES: Realizar agendamentos, cancelamentos e exames automaticamente quando dados estiverem completos

TIPOS DE AÇÃO DETECTÁVEIS:
- AGENDAMENTO: Para consultas, exames ou procedimentos
- CANCELAMENTO: Para cancelar consultas existentes
- EXAME: Para orientar sobre resultados de exames
- DUVIDA: Para responder perguntas gerais
- EMERGENCIA: Para situações urgentes

RESPONDA SEMPRE DE FORMA NATURAL E HUMANIZADA, mantendo o contexto da conversa.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Mensagem do paciente: "${mensagem}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const respostaIA = openaiData.choices[0]?.message?.content || 'Desculpe, não entendi. Poderia repetir?';

    // 5. Analisar resposta para detectar ação
    const acaoResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analise a resposta da IA e extraia informações para execução de ações. Responda APENAS em JSON válido.`
          },
          {
            role: 'user',
            content: `Resposta da IA: "${respostaIA}"

Analise e responda em JSON:
{
  "acao": "agendamento|cancelamento|exame|duvida|emergencia|nenhuma",
  "etapa_atual": "inicial|identificacao|coleta_dados|confirmacao|encerramento",
  "dados_coletados": {
    "nome": "string ou null",
    "telefone": "string ou null", 
    "data_agendamento": "YYYY-MM-DD ou null",
    "hora_agendamento": "HH:MM ou null",
    "tipo_consulta": "string ou null",
    "medico": "string ou null",
    "sintomas": ["array de strings ou array vazio"],
    "consulta_id": "string ou null"
  },
  "dados_completos": true|false,
  "deve_continuar": true|false,
  "acao_especifica": "descrição da ação a executar"
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    let analiseAcao = {
      acao: 'nenhuma',
      etapa_atual: 'inicial',
      dados_coletados: {},
      dados_completos: false,
      deve_continuar: true,
      acao_especifica: ''
    };

    if (acaoResponse.ok) {
      const acaoData = await acaoResponse.json();
      try {
        const acaoText = acaoData.choices[0]?.message?.content || '{}';
        analiseAcao = JSON.parse(acaoText);
      } catch (e) {
        console.error('Erro ao parsear análise de ação:', e);
      }
    }

    // 6. Atualizar contexto da conversa
    contextoAtual.historico_conversa.push({
      tipo: 'ia',
      mensagem: respostaIA,
      timestamp: new Date().toISOString()
    });

    // Atualizar dados coletados e etapa
    contextoAtual.dados_agendamento = { ...contextoAtual.dados_agendamento, ...analiseAcao.dados_coletados };
    contextoAtual.etapa = analiseAcao.etapa_atual;
    contextoAtual.acao_atual = analiseAcao.acao;
    contextoAtual.deve_continuar = analiseAcao.deve_continuar;

    // 7. Salvar contexto atualizado
    if (paciente_id) {
      // Verificar se já existe um contexto ativo
      const existingContextResponse = await fetch(
        `${supabaseUrl}/rest/v1/ia_contextos?paciente_id=eq.${paciente_id}&status=eq.ativo&order=atualizado_em.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );

      if (existingContextResponse.ok) {
        const existingData = await existingContextResponse.json();
        
        if (existingData.length > 0) {
          // Atualizar contexto existente
          await fetch(`${supabaseUrl}/rest/v1/ia_contextos?id=eq.${existingData[0].id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contexto: contextoAtual,
              atualizado_em: new Date().toISOString()
            }),
          });
        } else {
          // Criar novo contexto
          await fetch(`${supabaseUrl}/rest/v1/ia_contextos`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paciente_id,
              origem,
              contexto: contextoAtual,
              status: 'ativo'
            }),
          });
        }
      }
    }

    // 8. Executar ação automática se dados estiverem completos
    let resultadoAcao = null;
    if (analiseAcao.dados_completos && analiseAcao.acao !== 'nenhuma') {
      switch (analiseAcao.acao) {
        case 'agendamento':
          resultadoAcao = await executarAgendamento(supabaseUrl, serviceRoleKey, contextoAtual.dados_agendamento);
          break;
        case 'cancelamento':
          resultadoAcao = await executarCancelamento(supabaseUrl, serviceRoleKey, contextoAtual.dados_agendamento.consulta_id);
          break;
        case 'exame':
          resultadoAcao = await processarExame(supabaseUrl, serviceRoleKey, contextoAtual.dados_agendamento);
          break;
      }
    }

    // 9. Finalizar conversa se necessário
    if (!analiseAcao.deve_continuar || analiseAcao.etapa_atual === 'encerramento') {
      if (paciente_id) {
        await fetch(`${supabaseUrl}/rest/v1/ia_contextos?paciente_id=eq.${paciente_id}&status=eq.ativo`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'concluido',
            atualizado_em: new Date().toISOString()
          }),
        });
      }
    }

    // 10. Registrar no log
    if (paciente_id) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/ia_message_logs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paciente_id,
            mensagem_original: mensagem,
            analise_ia: {
              resposta_ia: respostaIA,
              acao_detectada: analiseAcao,
              resultado_acao: resultadoAcao
            },
            modelo_usado: 'gpt-3.5-turbo',
            created_at: new Date().toISOString(),
          }),
        });
      } catch (logError) {
        console.error('Erro ao registrar log:', logError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        resposta: respostaIA,
        etapa_atual: analiseAcao.etapa_atual,
        acao_detectada: analiseAcao.acao,
        dados_coletados: contextoAtual.dados_agendamento,
        deve_continuar: analiseAcao.deve_continuar,
        resultado_acao: resultadoAcao,
        contexto_salvo: !!paciente_id
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Agent IA error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao processar mensagem',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Função para executar agendamento
async function executarAgendamento(supabaseUrl: string, serviceRoleKey: string, dados: any) {
  try {
    const agendamentoResponse = await fetch(`${supabaseUrl}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data_agendamento: dados.data_agendamento,
        hora_agendamento: dados.hora_agendamento,
        tipo_consulta: dados.tipo_consulta,
        medico_responsavel: dados.medico,
        status: 'agendado',
        observacoes: `Agendado via IA: ${dados.sintomas ? 'Sintomas: ' + dados.sintomas.join(', ') : ''}`,
        created_at: new Date().toISOString(),
      }),
    });

    if (agendamentoResponse.ok) {
      const agendamento = await agendamentoResponse.json();
      return {
        tipo: 'agendamento',
        sucesso: true,
        agendamento_id: agendamento[0]?.id,
        mensagem: `Consulta agendada com sucesso para ${dados.data_agendamento} às ${dados.hora_agendamento}`
      };
    } else {
      return {
        tipo: 'agendamento',
        sucesso: false,
        erro: 'Erro ao criar agendamento'
      };
    }
  } catch (error) {
    return {
      tipo: 'agendamento',
      sucesso: false,
      erro: error.message
    };
  }
}

// Função para executar cancelamento
async function executarCancelamento(supabaseUrl: string, serviceRoleKey: string, consultaId: string) {
  try {
    const cancelamentoResponse = await fetch(`${supabaseUrl}/rest/v1/agendamentos?id=eq.${consultaId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'cancelado',
        observacoes: 'Cancelado via IA',
        updated_at: new Date().toISOString(),
      }),
    });

    return {
      tipo: 'cancelamento',
      sucesso: cancelamentoResponse.ok,
      mensagem: cancelamentoResponse.ok 
        ? 'Consulta cancelada com sucesso'
        : 'Erro ao cancelar consulta'
    };
  } catch (error) {
    return {
      tipo: 'cancelamento',
      sucesso: false,
      erro: error.message
    };
  }
}

// Função para processar exame
async function processarExame(supabaseUrl: string, serviceRoleKey: string, dados: any) {
  return {
    tipo: 'exame',
    sucesso: true,
    mensagem: 'Solicitação de exame processada. Orientaremos sobre os resultados em breve.'
  };
}

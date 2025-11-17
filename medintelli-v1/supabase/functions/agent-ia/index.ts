Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const openaiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4-turbo';

    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { mensagem, paciente_id, origem = 'app' } = await req.json();

    if (!mensagem) {
      throw new Error('Mensagem obrigatoria');
    }

    console.log('agent-ia: iniciando processamento', { mensagem, paciente_id, origem });

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

    // 2. Carregar base de conhecimento medica do banco de dados (BUC dinamica)
    let baseConhecimento = `Base de Conhecimento Medico - MedIntelli

IDENTIDADE E PAPEL:
Voce e o assistente virtual especializado da clinica MedIntelli, focado em atendimento medico, triagem de pacientes e gestao de consultas. Sua funcao e proporcionar orientacao medica preliminar, agendar consultas, processar cancelamentos e fornecer informacoes sobre exames.`;

    try {
      // Buscar a versão mais recente da BUC
      const bucResponse = await fetch(
        `${supabaseUrl}/rest/v1/buc_versoes?select=conteudo&order=version.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );

      if (bucResponse.ok) {
        const bucData = await bucResponse.json();
        if (bucData && bucData.length > 0 && bucData[0].conteudo) {
          // Substituir pela BUC do banco de dados
          baseConhecimento = bucData[0].conteudo;
          console.log('BUC carregada do banco de dados');
        } else {
          console.log('Nenhuma BUC encontrada, usando BUC padrao');
        }
      } else {
        console.warn('Erro ao buscar BUC, usando BUC padrao');
      }
    } catch (error) {
      console.error('Erro ao carregar BUC:', error);
      console.log('Usando BUC padrao');
    }

    // 3. Adicionar contexto da conversa ao historico
    contextoAtual.historico_conversa.push({
      tipo: 'paciente',
      mensagem: mensagem,
      timestamp: new Date().toISOString()
    });

    // 4. Gerar resposta conversacional com timeout de 20s
    const systemPrompt = `${baseConhecimento}

CONTEXTO DA CONVERSA ATUAL:
- Etapa: ${contextoAtual.etapa}
- Dados coletados: ${JSON.stringify(contextoAtual.dados_agendamento)}
- Historico: ${contextoAtual.historico_conversa.map(h => `${h.tipo}: ${h.mensagem}`).join('\n')}

INSTRUCOES PARA CONVERSA CONTINUA:
1. FUNCAO: Acompanhar o paciente ate o fim do atendimento
2. FLUXO: Uma pergunta → uma resposta ate completar
3. ETAPAS: cumprimentar → identificar → coletar dados → confirmar → encerrar
4. ACOES: Realizar agendamentos, cancelamentos e exames automaticamente quando dados estiverem completos

TIPOS DE ACAO DETECTAVEIS:
- AGENDAMENTO: Para consultas, exames ou procedimentos
- CANCELAMENTO: Para cancelar consultas existentes
- ENVIAR_EXAME: Quando paciente quer enviar resultados de exames
- DUVIDA: Para responder perguntas gerais
- EMERGENCIA: Para situacoes urgentes

RESPONDA SEMPRE DE FORMA NATURAL E HUMANIZADA, mantendo o contexto da conversa.`;

    let respostaIA = '';
    let tokensUsados = 0;
    let intencaoDetectada = 'nenhuma';
    
    try {
      // AbortController para timeout de 20 segundos
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 20000);

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: openaiModel,
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
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      respostaIA = openaiData.choices[0]?.message?.content || 'Desculpe, nao entendi. Poderia repetir?';
      tokensUsados = openaiData.usage?.total_tokens || 0;

      console.log('agent-ia: resposta OpenAI gerada', { tokensUsados });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('agent-ia: timeout na chamada OpenAI (20s)');
        respostaIA = 'O sistema esta temporariamente lento. Pode repetir sua pergunta?';
      } else {
        console.error('agent-ia: erro OpenAI', error);
        throw error;
      }
    }

    // 5. Analisar intencao (simplificado para evitar segundo timeout)
    let analiseAcao = {
      acao: 'nenhuma',
      etapa_atual: 'inicial',
      dados_coletados: {},
      dados_completos: false,
      deve_continuar: true,
      acao_especifica: ''
    };

    // Deteccao simples de intencoes
    const mensagemLower = mensagem.toLowerCase();
    if (mensagemLower.includes('enviar') && (mensagemLower.includes('exame') || mensagemLower.includes('resultado'))) {
      analiseAcao.acao = 'enviar_exame';
      intencaoDetectada = 'enviar_exame';
      // Registrar evento em app_messages para interface mostrar botao de upload
      if (paciente_id) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/app_messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paciente_id,
              tipo: 'enviar_exame',
              mensagem: 'Solicitacao de envio de exame detectada',
              status: 'pendente',
              created_at: new Date().toISOString(),
            }),
          });
        } catch (e) {
          console.error('agent-ia: erro ao registrar app_message', e);
        }
      }
    } else if (mensagemLower.includes('agendar') || mensagemLower.includes('consulta') || mensagemLower.includes('marcar')) {
      analiseAcao.acao = 'agendamento';
      intencaoDetectada = 'agendamento';
    } else if (mensagemLower.includes('cancelar')) {
      analiseAcao.acao = 'cancelamento';
      intencaoDetectada = 'cancelamento';
    } else if (mensagemLower.includes('emergencia') || mensagemLower.includes('urgente') || mensagemLower.includes('socorro')) {
      analiseAcao.acao = 'emergencia';
      intencaoDetectada = 'emergencia';
    } else {
      intencaoDetectada = 'duvida';
    }

    console.log('agent-ia: intencao detectada', { intencao: intencaoDetectada, acao: analiseAcao.acao });

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

    // 8. Registrar no log
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
              intencao: intencaoDetectada,
              tokens_usados: tokensUsados
            },
            modelo_usado: openaiModel,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (logError) {
        console.error('agent-ia: erro ao registrar log', logError);
      }
    }

    console.log('agent-ia: processamento concluido', { intencao: intencaoDetectada, tokensUsados });

    return new Response(JSON.stringify({
      success: true,
      data: {
        resposta: respostaIA,
        etapa_atual: analiseAcao.etapa_atual,
        acao_detectada: analiseAcao.acao,
        intencao: intencaoDetectada,
        dados_coletados: contextoAtual.dados_agendamento,
        deve_continuar: analiseAcao.deve_continuar,
        contexto_salvo: !!paciente_id
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('agent-ia: erro geral', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao processar mensagem',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const openaiKey = Deno.env.get('OPENAI_API_KEY');

        if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
            throw new Error('Configuration missing');
        }

        const requestId = crypto.randomUUID();
        const startTime = Date.now();

        // Log estruturado
        console.log(JSON.stringify({
            requestId,
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        }));

        if (req.method === 'POST') {
            const { mensagem, paciente_id, contexto } = await req.json();

            if (!mensagem) {
                throw new Error('mensagem is required');
            }

            // Buscar conhecimento ativo
            const knowledgeResponse = await fetch(
                `${supabaseUrl}/rest/v1/knowledge_store?active=eq.true&order=version.desc&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!knowledgeResponse.ok) {
                throw new Error('Failed to fetch knowledge base');
            }

            const knowledgeData = await knowledgeResponse.json();
            if (knowledgeData.length === 0) {
                throw new Error('No active knowledge base found');
            }

            const knowledge = knowledgeData[0];

            // Usar OpenAI para classificar intenção
            const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `Você é um assistente inteligente da clínica MedIntelli. Use apenas as informações da Base de Conhecimento fornecida para responder. Classifique a intenção do usuário e responda adequadamente.

Base de Conhecimento:
${knowledge.content}

CLASSIFICAÇÃO DE INTENÇÕES:
1. AGENDAMENTO: Solicitar, confirmar, cancelar ou reagendar consultas
2. INFORMAÇÃO: Perguntas sobre horários, especialidades, localização
3. RESULTADO_EXAME: Solicitar resultados ou enviar exames
4. EMERGENCIA: Situações urgentes que necessitam atendimento imediato
5. OUTROS: Outras consultas gerais

Responda sempre em português brasileiro de forma cordial e profissional.`
                        },
                        {
                            role: 'user',
                            content: `Paciente ID: ${paciente_id || 'não informado'}
Contexto: ${contexto || 'nenhum'}
Mensagem: ${mensagem}`
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                })
            });

            if (!intentResponse.ok) {
                throw new Error('OpenAI API error');
            }

            const intentData = await intentResponse.json();
            const response = intentData.choices[0].message.content;

            // Tentar extrair intenção da resposta
            let intent = 'OUTROS';
            let needsAction = false;
            let actionData = {};

            if (response.toLowerCase().includes('agendamento') || 
                response.toLowerCase().includes('consulta') ||
                response.toLowerCase().includes('agendar')) {
                intent = 'AGENDAMENTO';
                needsAction = true;
            } else if (response.toLowerCase().includes('exame') || 
                      response.toLowerCase().includes('resultado')) {
                intent = 'RESULTADO_EXAME';
                needsAction = true;
            } else if (response.toLowerCase().includes('emergência') || 
                      response.toLowerCase().includes('urgente')) {
                intent = 'EMERGENCIA';
                needsAction = true;
            }

            // Se é um agendamento, tentar extrair informações
            if (intent === 'AGENDAMENTO' && needsAction) {
                const scheduleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: 'Extraia as informações de agendamento da mensagem do usuário. Responda em JSON com: data (DD/MM/YYYY), horario (HH:MM), tipo_consulta, nome_paciente. Se alguma informação estiver faltando, use null.'
                            },
                            {
                                role: 'user',
                                content: mensagem
                            }
                        ],
                        max_tokens: 200,
                        temperature: 0
                    })
                });

                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    const scheduleText = scheduleData.choices[0].message.content;
                    
                    try {
                        const jsonMatch = scheduleText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            actionData = JSON.parse(jsonMatch[0]);
                        }
                    } catch (parseError) {
                        console.log('Could not parse schedule data');
                    }
                }
            }

            // Salvar conversa no banco
            const conversationData = {
                paciente_id,
                message_content: response,
                message_type: 'text',
                from_number: '5516988707777',
                to_number: paciente_id ? 'paciente' : 'unknown',
                direction: 'outbound',
                status: 'sent',
                categoria: intent.toLowerCase(),
                message_id: crypto.randomUUID(),
                sent_at: new Date().toISOString(),
                classificacao_automatica: true,
                raw_data: {
                    intent,
                    original_message: mensagem,
                    action_data: actionData,
                    knowledge_version: knowledge.version
                }
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(conversationData)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error('Failed to save conversation:', errorText);
            }

            console.log(JSON.stringify({
                requestId,
                action: 'ai_response',
                intent,
                needsAction,
                pacienteId: paciente_id,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    resposta: response,
                    intencao: intent,
                    precisa_acao: needsAction,
                    dados_acao: actionData,
                    version_conhecimento: knowledge.version
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'PUT') {
            // Atualizar Base de Conhecimento
            const { content, version } = await req.json();

            if (!content) {
                throw new Error('content is required');
            }

            // Desativar versões anteriores
            await fetch(`${supabaseUrl}/rest/v1/knowledge_store`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: false })
            });

            // Criar nova versão
            const newVersion = version || (Date.now());
            const newKnowledgeResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_store`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    version: newVersion,
                    content: content,
                    active: true
                })
            });

            if (!newKnowledgeResponse.ok) {
                const errorText = await newKnowledgeResponse.text();
                throw new Error(`Failed to update knowledge base: ${errorText}`);
            }

            const newKnowledge = await newKnowledgeResponse.json();

            console.log(JSON.stringify({
                requestId,
                action: 'update_knowledge',
                version: newVersion,
                contentLength: content.length,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    message: 'Base de conhecimento atualizada',
                    version: newVersion,
                    knowledgeId: newKnowledge[0].id
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else if (req.method === 'GET') {
            // Buscar Base de Conhecimento ativa
            const knowledgeResponse = await fetch(
                `${supabaseUrl}/rest/v1/knowledge_store?active=eq.true&order=version.desc&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!knowledgeResponse.ok) {
                throw new Error('Failed to fetch knowledge base');
            }

            const knowledgeData = await knowledgeResponse.json();

            return new Response(JSON.stringify({
                data: knowledgeData.length > 0 ? knowledgeData[0] : null
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not allowed`);

    } catch (error) {
        console.error('AI Agent function error:', error);

        const errorResponse = {
            error: {
                code: 'AI_AGENT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

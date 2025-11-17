// Função para verificar se o número está na whitelist
function allowedCheck(phoneNumber: string): boolean {
    const allowedNumbers = ['+5516988707777', '16988707777', '16 988707777'];
    return allowedNumbers.includes(phoneNumber);
}

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
        const avisaApiUrl = Deno.env.get('AVISA_API_URL') || 'https://api.avisa.com.br';
        const avisaApiKey = Deno.env.get('AVISA_API_KEY');

        if (!supabaseUrl || !serviceRoleKey || !avisaApiKey) {
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
            // Get user from auth header
            const authHeader = req.headers.get('authorization');
            if (!authHeader) {
                throw new Error('No authorization header');
            }

            const token = authHeader.replace('Bearer ', '');

            // Verify token and get user
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!userResponse.ok) {
                throw new Error('Invalid token');
            }

            const { 
                paciente_id, 
                categoria = 'agenda', 
                tipo = 'confirmacao_agendamento', 
                conteudo, 
                destinatario_telefone, 
                template_id,
                data_agendamento 
            } = await req.json();

            if (!destinatario_telefone) {
                throw new Error('destinatario_telefone is required');
            }

            // Validar se o número está na whitelist
            if (!allowedCheck(destinatario_telefone)) {
                console.log(`Whitelist: Número ${destinatario_telefone} não autorizado. Mensagem não enviada.`);
                return new Response(JSON.stringify({
                    error: {
                        code: 'PHONE_NOT_AUTHORIZED',
                        message: 'Número não autorizado na whitelist. Use apenas números permitidos para testes.'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Buscar template se especificado
            let messageContent = conteudo;
            if (template_id) {
                const templateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/whatsapp_templates?id=eq.${template_id}&is_active=eq.true`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const templates = await templateResponse.json();
                if (templates.length > 0) {
                    messageContent = templates[0].content;
                }
            }

            if (!messageContent) {
                throw new Error('No content provided and no template found');
            }

            // Enviar via Avisa API
            const avisaPayload = {
                to: destinatario_telefone,
                type: 'text',
                text: {
                    body: messageContent
                }
            };

            const avisaResponse = await fetch(`${avisaApiUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${avisaApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(avisaPayload)
            });

            if (!avisaResponse.ok) {
                const errorText = await avisaResponse.text();
                throw new Error(`Avisa API error: ${errorText}`);
            }

            const avisaResult = await avisaResponse.json();

            // Registrar mensagem no banco
            const messageData = {
                paciente_id,
                categoria,
                tipo,
                message_content: messageContent,
                template_id,
                destinatario_telefone,
                status_envio: 'enviado',
                mensagem_origem: 'sistema',
                data_agendamento,
                avisa_message_id: avisaResult.id || avisaResult.messageId,
                from_number: '5516988707777',
                to_number: destinatario_telefone,
                delivery_status: 'sent'
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(messageData)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error('Failed to record message:', errorText);
            }

            const recordedMessage = await insertResponse.json();

            console.log(JSON.stringify({
                requestId,
                action: 'send_message',
                messageId: recordedMessage[0]?.id,
                phone: destinatario_telefone,
                category: categoria,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    message: 'Mensagem enviada com sucesso',
                    avisaId: avisaResult.id || avisaResult.messageId,
                    localId: recordedMessage[0]?.id
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'GET') {
            // Listar mensagens
            const url = new URL(req.url);
            const categoria = url.searchParams.get('categoria');
            const limit = url.searchParams.get('limit') || '50';

            let query = `${supabaseUrl}/rest/v1/whatsapp_messages?order=sent_at.desc&limit=${limit}`;

            if (categoria) {
                query += `&categoria=eq.${categoria}`;
            }

            const response = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch messages: ${errorText}`);
            }

            const messages = await response.json();

            console.log(JSON.stringify({
                requestId,
                action: 'list_messages',
                count: messages.length,
                category: categoria,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ data: messages }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // NOVOS ENDPOINTS PARA TEMPLATES WHATSAPP

        } else if (req.method === 'POST' && req.url.includes('/template/cancelamento')) {
            // Endpoint específico para template de cancelamento
            const { 
                nomePaciente, 
                dataConsulta, 
                horarioConsulta, 
                especialidade, 
                profissional,
                telefonePaciente,
                motivoCancelamento,
                tipoCancelamento = 'paciente'
            } = await req.json();

            if (!nomePaciente || !dataConsulta || !horarioConsulta || !telefonePaciente || !motivoCancelamento) {
                throw new Error('Parâmetros obrigatórios: nomePaciente, dataConsulta, horarioConsulta, telefonePaciente, motivoCancelamento');
            }

            // Template de cancelamento
            const mensagemTexto = `❌ Cancelamento de Consulta – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nSua consulta marcada para o dia *${dataConsulta}* às *${horarioConsulta}* foi *cancelada*.\n\n🧠 Motivo: ${motivoCancelamento}\n\nSe desejar, podemos reagendar para uma nova data.\nBasta responder com *Reagendar* para receber novas opções de horários.\n\nAgradecemos sua compreensão e continuamos à disposição.\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

            const avisaPayload = {
                to: telefonePaciente,
                type: 'text',
                text: { body: mensagemTexto }
            };

            const avisaResponse = await fetch(`${avisaApiUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${avisaApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(avisaPayload)
            });

            if (!avisaResponse.ok) {
                const errorText = await avisaResponse.text();
                throw new Error(`Avisa API error: ${errorText}`);
            }

            const avisaResult = await avisaResponse.json();

            return new Response(JSON.stringify({
                success: true,
                message: 'Cancelamento comunicado com sucesso',
                template: 'cancelamento_consulta',
                paciente: nomePaciente,
                consulta_cancelada: `${dataConsulta} às ${horarioConsulta}`,
                motivo: motivoCancelamento,
                tipo_cancelamento: tipoCancelamento,
                to: telefonePaciente
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'POST' && req.url.includes('/template/lembrete')) {
            // Endpoint específico para template de lembrete
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
                throw new Error('Parâmetros obrigatórios: nomePaciente, dataConsulta, horarioConsulta, telefonePaciente');
            }

            // Template de lembrete
            const antecedencia = minutosAntecedencia === 1440 ? 'amanhã' : `${minutosAntecedencia} minutos antes`;
            const mensagemTexto = `⏰ Lembrete de Consulta – Clínica MedIntelli\n\nOlá ${nomePaciente} 👋\n\nLembramos que você tem uma *consulta agendada* para *${antecedencia}*, dia *${dataConsulta}* às *${horarioConsulta}*.\n\n📍 Local: Clínica MedIntelli\n🧠 Especialidade: ${especialidade || motivo || 'Consulta de rotina'}\n👩‍⚕️ Profissional: ${profissional || 'Dr. Francisco'}\n\nPor favor, confirme sua presença respondendo com *Sim* ou *Não*.\nSe precisar reagendar, responda com *Reagendar*.\n\nAgradecemos sua pontualidade!\n\n💡 Mensagem automática – Sistema Inteligente MedIntelli.`;

            const avisaPayload = {
                to: telefonePaciente,
                type: 'text',
                text: { body: mensagemTexto }
            };

            const avisaResponse = await fetch(`${avisaApiUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${avisaApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(avisaPayload)
            });

            if (!avisaResponse.ok) {
                const errorText = await avisaResponse.text();
                throw new Error(`Avisa API error: ${errorText}`);
            }

            const avisaResult = await avisaResponse.json();

            return new Response(JSON.stringify({
                success: true,
                message: 'Lembrete enviado com sucesso',
                template: 'lembrete_consulta',
                paciente: nomePaciente,
                consulta: `${dataConsulta} às ${horarioConsulta}`,
                antecedencia_minutos: minutosAntecedencia,
                to: telefonePaciente
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'POST' && req.url.includes('/template/alerta')) {
            // Endpoint específico para template de alerta de erro
            const { titulo, detalhe, telefoneAdmin, dataHora } = await req.json();

            if (!titulo || !detalhe || !telefoneAdmin) {
                throw new Error('Parâmetros obrigatórios: titulo, detalhe, telefoneAdmin');
            }

            // Template de alerta
            const mensagemTexto = `🩺 Alerta Automático – Sistema MedIntelli\n\n⚠️ *${titulo}*\n\n${detalhe}\n\n📅 Data/Hora: ${dataHora}\n\n🔍 Sistema: MedIntelli - Agendamentos\nPor favor, verifique no painel de logs.\n\n💡 Mensagem enviada automaticamente pelo agente de IA.`;

            const avisaPayload = {
                to: telefoneAdmin,
                type: 'text',
                text: { body: mensagemTexto }
            };

            const avisaResponse = await fetch(`${avisaApiUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${avisaApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(avisaPayload)
            });

            if (!avisaResponse.ok) {
                const errorText = await avisaResponse.text();
                throw new Error(`Avisa API error: ${errorText}`);
            }

            const avisaResult = await avisaResponse.json();

            return new Response(JSON.stringify({
                success: true,
                message: 'Alerta enviado com sucesso',
                template: 'alerta_erro_agendamento',
                titulo,
                telefoneAdmin,
                dataHora
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        }

        throw new Error(`Method ${req.method} not allowed or route not found`);

    } catch (error) {
        console.error('WhatsApp send function error:', error);

        const errorResponse = {
            error: {
                code: 'WHATSAPP_SEND_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

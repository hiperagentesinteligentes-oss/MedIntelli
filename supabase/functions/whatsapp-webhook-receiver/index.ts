// Função para verificar se o número está na whitelist
function allowedCheck(phoneNumber: string): boolean {
    const allowedNumbers = ['+5516988707777', '16988707777', '16 988707777'];
    return allowedNumbers.includes(phoneNumber);
}

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
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
        const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
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
            // Validar webhook secret
            const signature = req.headers.get('x-webhook-signature');
            if (webhookSecret && signature !== webhookSecret) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'INVALID_SIGNATURE',
                        message: 'Invalid webhook signature'
                    }
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const body = await req.json();
            console.log('Webhook payload:', JSON.stringify(body));

            // Processar diferentes tipos de eventos
            if (body.type === 'message_received') {
                // Nova mensagem recebida
                const { from, message, timestamp, messageId } = body;

                // Validar se o número está na whitelist
                if (!allowedCheck(from)) {
                    console.log(`Whitelist: Número ${from} não autorizado. Ignorando mensagem.`);
                    return new Response(JSON.stringify({ 
                        data: { 
                            status: 'ignored',
                            reason: 'Número não autorizado na whitelist',
                            timestamp: new Date().toISOString()
                        } 
                    }), {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Buscar paciente pelo telefone
                const patientResponse = await fetch(
                    `${supabaseUrl}/rest/v1/pacientes?or=(telefone.eq.${from},celular.eq.${from})`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const patients = await patientResponse.json();
                const pacienteId = patients.length > 0 ? patients[0].id : null;

                // Salvar mensagem recebida
                const receivedMessage = {
                    paciente_id: pacienteId,
                    message: message.text || message.body,
                    message_type: message.type || 'text',
                    from_number: from,
                    to_number: '5516988707777',
                    message_id: messageId,
                    timestamp: new Date(timestamp * 1000).toISOString(),
                    direction: 'inbound',
                    status: 'received',
                    delivery_status: 'received',
                    received_at: new Date().toISOString(),
                    raw_data: body,
                    categoria: 'conversa',
                    classificacao_automatica: true
                };

                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(receivedMessage)
                });

                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    console.error('Failed to save received message:', errorText);
                }

                console.log(JSON.stringify({
                    requestId,
                    action: 'message_received',
                    from,
                    messageId,
                    pacienteId,
                    duration: Date.now() - startTime
                }));

            } else if (body.type === 'message_status') {
                // Status da mensagem atualizada
                const { messageId, status, timestamp, to } = body;

                // Atualizar status da mensagem
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/whatsapp_messages?avisa_message_id=eq.${messageId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            delivery_status: status,
                            updated_at: new Date().toISOString()
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error('Failed to update message status:', errorText);
                }

                // Se for confirmação de agendamento, atualizar o agendamento
                if (status === 'delivered' || status === 'read') {
                    // Buscar a mensagem para ver se é uma confirmação
                    const messageResponse = await fetch(
                        `${supabaseUrl}/rest/v1/whatsapp_messages?avisa_message_id=eq.${messageId}&select=*`,
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );

                    const messages = await messageResponse.json();
                    if (messages.length > 0) {
                        const msg = messages[0];
                        
                        // Se é uma mensagem de confirmação de agendamento
                        if (msg.categoria === 'agenda' && msg.tipo === 'confirmacao_agendamento') {
                            // Marcar agendamento como confirmado pelo paciente
                            const updateAppointmentResponse = await fetch(
                                `${supabaseUrl}/rest/v1/agendamentos?paciente_id=eq.${msg.paciente_id}&data_agendamento=eq.${msg.data_agendamento}`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        confirmado_paciente: true,
                                        data_confirmacao: new Date().toISOString(),
                                        status: 'confirmado',
                                        updated_at: new Date().toISOString()
                                    })
                                }
                            );

                            if (!updateAppointmentResponse.ok) {
                                const errorText = await updateAppointmentResponse.text();
                                console.error('Failed to update appointment:', errorText);
                            }

                            console.log(JSON.stringify({
                                requestId,
                                action: 'appointment_confirmed',
                                appointmentId: msg.data_agendamento,
                                pacienteId: msg.paciente_id,
                                duration: Date.now() - startTime
                            }));
                        }
                    }
                }

                console.log(JSON.stringify({
                    requestId,
                    action: 'message_status',
                    messageId,
                    status,
                    duration: Date.now() - startTime
                }));
            }

            return new Response(JSON.stringify({ 
                data: { 
                    status: 'processed',
                    timestamp: new Date().toISOString()
                } 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'GET') {
            // Webhook verification
            const url = new URL(req.url);
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            if (mode === 'subscribe' && token === webhookSecret) {
                return new Response(challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }

            return new Response('Forbidden', { status: 403 });
        }

        throw new Error(`Method ${req.method} not allowed`);

    } catch (error) {
        console.error('WhatsApp webhook error:', error);

        const errorResponse = {
            error: {
                code: 'WHATSAPP_WEBHOOK_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

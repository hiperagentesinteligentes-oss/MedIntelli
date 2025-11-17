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
            const { tipo = 'lembrete_agendamento' } = await req.json();

            const agora = new Date();
            const manutenha = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // 24 horas

            if (tipo === 'lembrete_agendamento') {
                // Buscar agendamentos que precisam de lembrete (24h antes)
                const appointmentsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/agendamentos?data_agendamento=gte.${agora.toISOString()}&data_agendamento=lte.${manutenha.toISOString()}&status=eq.confirmado&lembrete_enviado=eq.false&select=*,paciente:pacientes(nome,telefone)`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!appointmentsResponse.ok) {
                    throw new Error('Failed to fetch appointments');
                }

                const appointments = await appointmentsResponse.json();
                let sentCount = 0;
                let errorCount = 0;

                for (const appointment of appointments) {
                    try {
                        if (!appointment.paciente?.telefone) {
                            console.log(`No phone for patient ${appointment.paciente?.nome}`);
                            continue;
                        }

                        // Formatar data e hora
                        const dataHora = new Date(appointment.data_agendamento);
                        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
                        const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });

                        const message = `Olá ${appointment.paciente.nome}! 

Este é um lembrete da sua consulta agendada para ${dataFormatada} às ${horaFormatada}.

Por favor, chegue com 15 minutos de antecedência.

Para cancelar ou reagendar, entre em contato conosco.

Obrigado!`;

                        // Enviar lembrete via WhatsApp
                        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send-message`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                paciente_id: appointment.paciente_id,
                                categoria: 'agenda',
                                tipo: 'lembrete_agendamento',
                                conteudo: message,
                                destinatario_telefone: appointment.paciente.telefone,
                                data_agendamento: appointment.data_agendamento
                            })
                        });

                        if (sendResponse.ok) {
                            // Marcar lembrete como enviado
                            await fetch(`${supabaseUrl}/rest/v1/agendamentos?id=eq.${appointment.id}`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    lembrete_enviado: true,
                                    data_lembrete: new Date().toISOString()
                                })
                            });

                            sentCount++;
                            console.log(`Reminder sent to ${appointment.paciente.telefone}`);
                        } else {
                            errorCount++;
                            console.error(`Failed to send reminder to ${appointment.paciente.telefone}`);
                        }

                    } catch (appointmentError) {
                        errorCount++;
                        console.error('Error processing appointment:', appointmentError);
                    }
                }

                console.log(JSON.stringify({
                    requestId,
                    action: 'send_reminders',
                    total: appointments.length,
                    sent: sentCount,
                    errors: errorCount,
                    duration: Date.now() - startTime
                }));

                return new Response(JSON.stringify({
                    data: {
                        message: 'Lembretes processados',
                        total: appointments.length,
                        enviados: sentCount,
                        erros: errorCount
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } else if (tipo === 'confirmacao_pendente') {
                // Buscar agendamentos que precisam de confirmação (mais de 2h sem resposta)
                const duasHorasAtras = new Date(agora.getTime() - 2 * 60 * 60 * 1000);
                
                const pendingResponse = await fetch(
                    `${supabaseUrl}/rest/v1/agendamentos?status=eq.agendado&confirmado_paciente=eq.false&data_agendamento=gte.${agora.toISOString()}&data_agendamento=lte.${manutenha.toISOString()}&select=*,paciente:pacientes(nome,telefone)`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!pendingResponse.ok) {
                    throw new Error('Failed to fetch pending confirmations');
                }

                const pendingAppointments = await pendingResponse.json();
                let sentCount = 0;

                for (const appointment of pendingAppointments) {
                    try {
                        if (!appointment.paciente?.telefone) continue;

                        // Verificar se já foi enviado confirmação recentemente
                        const confirmationResponse = await fetch(
                            `${supabaseUrl}/rest/v1/whatsapp_messages?paciente_id=eq.${appointment.paciente_id}&categoria=eq.agenda&tipo=eq.confirmacao_agendamento&data_agendamento=eq.${appointment.data_agendamento}&sent_at=gte.${duasHorasAtras.toISOString()}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey
                                }
                            }
                        );

                        const recentConfirmations = await confirmationResponse.json();
                        if (recentConfirmations.length > 0) continue;

                        // Enviar confirmação
                        const dataHora = new Date(appointment.data_agendamento);
                        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
                        const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });

                        const message = `Olá ${appointment.paciente.nome}!

Sua consulta está agendada para ${dataFormatada} às ${horaFormatada}.

Por favor, confirme sua presença respondendo:
• SIM - para confirmar
• NAO - para cancelar
• REAGENDAR - para nova data

Aguardo sua confirmação!`;

                        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send-message`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                paciente_id: appointment.paciente_id,
                                categoria: 'agenda',
                                tipo: 'confirmacao_agendamento',
                                conteudo: message,
                                destinatario_telefone: appointment.paciente.telefone,
                                data_agendamento: appointment.data_agendamento
                            })
                        });

                        if (sendResponse.ok) {
                            sentCount++;
                        }

                    } catch (appointmentError) {
                        console.error('Error processing confirmation:', appointmentError);
                    }
                }

                return new Response(JSON.stringify({
                    data: {
                        message: 'Confirmações processadas',
                        enviados: sentCount,
                        total_pendentes: pendingAppointments.length
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else if (req.method === 'GET') {
            // Status do scheduler
            const hoje = new Date();
            const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);

            // Contar agendamentos de hoje
            const todayAppointmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/agendamentos?data_agendamento=gte.${inicioHoje.toISOString()}&data_agendamento=lt.${fimHoje.toISOString()}&select=id,status`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const todayAppointments = await todayAppointmentsResponse.json();
            const confirmados = todayAppointments.filter(a => a.status === 'confirmado').length;
            const pendentes = todayAppointments.filter(a => a.status === 'agendado').length;
            const total = todayAppointments.length;

            return new Response(JSON.stringify({
                data: {
                    status: 'running',
                    hoje: {
                        total,
                        confirmados,
                        pendentes
                    },
                    proximos_lembretes: Math.max(0, confirmados - 5), // estimativa
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not allowed`);

    } catch (error) {
        console.error('WhatsApp scheduler error:', error);

        const errorResponse = {
            error: {
                code: 'WHATSAPP_SCHEDULER_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

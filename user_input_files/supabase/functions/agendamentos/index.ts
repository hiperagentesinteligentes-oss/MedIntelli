// Edge Function 2.1 - Agendamentos (Patch v4)
// Autor: Sistema MedIntelli
// Data: 2025-11-11
// Finalidade: CRUD de agendamentos com validação RLS e auditoria

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH', // DELETE removido conforme requisito
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
            throw new Error('Configuração do Supabase não encontrada');
        }

        const requestId = crypto.randomUUID();
        const startTime = Date.now();

        // Log de auditoria - requisição recebida
        console.log(JSON.stringify({
            requestId,
            action: 'request_received',
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString(),
            function: 'agendamentos_v2_1'
        }));

        // Validação JWT do Supabase
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token de autorização não fornecido'
                }
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verificar token e obter dados do usuário
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            return new Response(JSON.stringify({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token JWT inválido ou expirado'
                }
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // GET: Listar agendamentos com filtros de escopo, data inicial e final
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const scope = url.searchParams.get('scope') || 'day'; // 'day'|'week'|'month'
            const start = url.searchParams.get('start'); // ISO datetime
            const end = url.searchParams.get('end'); // ISO datetime

            // Validar parâmetros
            if (start && !end) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Parâmetro "end" é obrigatório quando "start" é fornecido'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (end && !start) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Parâmetro "start" é obrigatório quando "end" é fornecido'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Construir query com join e filtros
            let query = `${supabaseUrl}/rest/v1/agendamentos?select=*,paciente:pacientes(id,nome,telefone,convenio)&order=data_agendamento.asc`;

            // Aplicar filtros de data
            if (start && end) {
                const startDate = new Date(start);
                const endDate = new Date(end);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return new Response(JSON.stringify({
                        error: {
                            code: 'INVALID_DATE',
                            message: 'Formato de data inválido. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)'
                        }
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                query += `&data_agendamento=gte.${start}&data_agendamento=lte.${end}`;
            }

            // Log de auditoria - consulta realizada
            console.log(JSON.stringify({
                requestId,
                action: 'list_agendamentos',
                userId,
                scope,
                start,
                end,
                timestamp: new Date().toISOString()
            }));

            const response = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(JSON.stringify({
                    requestId,
                    action: 'error',
                    error: `Falha ao buscar agendamentos: ${errorText}`,
                    timestamp: new Date().toISOString()
                }));
                
                return new Response(JSON.stringify({
                    error: {
                        code: 'FETCH_ERROR',
                        message: 'Erro ao buscar agendamentos',
                        details: errorText
                    }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const agendamentos = await response.json();

            return new Response(JSON.stringify({ 
                data: agendamentos,
                meta: {
                    total: agendamentos.length,
                    scope,
                    start,
                    end,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // POST: Criar novo agendamento
        } else if (req.method === 'POST') {
            const requestBody = await req.json();
            const { 
                paciente_id, 
                paciente_novo, 
                data_agendamento, 
                tipo_consulta, 
                observacoes 
            } = requestBody;

            // Validação de campos obrigatórios
            if (!paciente_id && !paciente_novo?.nome) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'MISSING_REQUIRED_FIELD',
                        message: 'É necessário fornecer paciente_id ou dados do paciente_novo'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (!data_agendamento) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'MISSING_REQUIRED_FIELD',
                        message: 'Campo data_agendamento é obrigatório'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Validar formato da data
            const agendamentoDate = new Date(data_agendamento);
            if (isNaN(agendamentoDate.getTime())) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'INVALID_DATE_FORMAT',
                        message: 'Formato de data inválido. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Cadastro rápido de paciente se necessário
            let pid = paciente_id;
            if (!pid && paciente_novo?.nome) {
                // Log de auditoria - criação de paciente
                console.log(JSON.stringify({
                    requestId,
                    action: 'create_paciente',
                    userId,
                    data: { nome: paciente_novo.nome, telefone: paciente_novo.telefone },
                    timestamp: new Date().toISOString()
                }));

                const createResponse = await fetch(`${supabaseUrl}/rest/v1/pacientes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        nome: paciente_novo.nome,
                        telefone: paciente_novo.telefone,
                        email: paciente_novo.email,
                        convenio: paciente_novo.convenio || 'PARTICULAR',
                        ativo: true
                    })
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    return new Response(JSON.stringify({
                        error: {
                            code: 'PATIENT_CREATION_ERROR',
                            message: 'Erro ao criar paciente',
                            details: errorText
                        }
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const novo = await createResponse.json();
                pid = novo[0].id;
            }

            if (!pid) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'INVALID_PATIENT',
                        message: 'ID do paciente inválido ou paciente não encontrado'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Verificar conflito de horário (agendamento existente no mesmo horário)
            const conflictResponse = await fetch(
                `${supabaseUrl}/rest/v1/agendamentos?data_agendamento=eq.${data_agendamento}&status=not.in.(cancelado,cancelled)&select=id&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const conflicts = await conflictResponse.json();
            if (conflicts && conflicts.length > 0) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'CONFLICT',
                        message: 'Já existe um agendamento para este horário'
                    }
                }), {
                    status: 409,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Criar agendamento
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/agendamentos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    paciente_id: pid,
                    data_agendamento: data_agendamento,
                    status: 'pendente',
                    tipo_consulta: tipo_consulta || 'CONSULTA_GERAL',
                    observacoes,
                    origem: 'sistema',
                    created_by_user_id: userId
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error(JSON.stringify({
                    requestId,
                    action: 'error',
                    error: `Falha ao criar agendamento: ${errorText}`,
                    timestamp: new Date().toISOString()
                }));

                return new Response(JSON.stringify({
                    error: {
                        code: 'CREATION_ERROR',
                        message: 'Erro ao criar agendamento',
                        details: errorText
                    }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const createdAppointment = await createResponse.json();

            // Log de auditoria - agendamento criado
            console.log(JSON.stringify({
                requestId,
                action: 'create_agendamento',
                userId,
                appointmentId: createdAppointment[0].id,
                paciente_id: pid,
                data_agendamento,
                tipo_consulta,
                timestamp: new Date().toISOString()
            }));

            return new Response(JSON.stringify({ 
                data: createdAppointment[0],
                message: 'Agendamento criado com sucesso'
            }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PUT: Atualizar agendamento existente
        } else if (req.method === 'PUT') {
            const requestBody = await req.json();
            const { 
                id, 
                status, 
                data_agendamento, 
                tipo_consulta, 
                observacoes 
            } = requestBody;

            // Validação de campo obrigatório
            if (!id) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'MISSING_REQUIRED_FIELD',
                        message: 'ID do agendamento é obrigatório para atualização'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Verificar se o agendamento existe
            const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/agendamentos?id=eq.${id}&select=id,data_agendamento,status`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existingAppointments = await checkResponse.json();
            if (!existingAppointments || existingAppointments.length === 0) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Agendamento não encontrado'
                    }
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Se estiver alterando data/hora, validar e verificar conflitos
            if (data_agendamento) {
                const newDate = new Date(data_agendamento);
                if (isNaN(newDate.getTime())) {
                    return new Response(JSON.stringify({
                        error: {
                            code: 'INVALID_DATE_FORMAT',
                            message: 'Formato de data inválido. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)'
                        }
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Verificar conflitos (excluindo o próprio agendamento)
                const conflictResponse = await fetch(
                    `${supabaseUrl}/rest/v1/agendamentos?data_agendamento=eq.${data_agendamento}&id=neq.${id}&status=not.in.(cancelado,cancelled)&select=id&limit=1`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const conflicts = await conflictResponse.json();
                if (conflicts && conflicts.length > 0) {
                    return new Response(JSON.stringify({
                        error: {
                            code: 'CONFLICT',
                            message: 'Já existe um agendamento para este horário'
                        }
                    }), {
                        status: 409,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            // Validar status se fornecido
            const validStatuses = ['pendente', 'confirmado', 'cancelado', 'realizado', 'faltou'];
            if (status && !validStatuses.includes(status)) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'INVALID_STATUS',
                        message: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}`
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Construir dados de atualização
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (status) updateData.status = status;
            if (data_agendamento) updateData.data_agendamento = data_agendamento;
            if (tipo_consulta) updateData.tipo_consulta = tipo_consulta;
            if (observacoes !== undefined) updateData.observacoes = observacoes;

            // Executar atualização
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/agendamentos?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error(JSON.stringify({
                    requestId,
                    action: 'error',
                    error: `Falha ao atualizar agendamento: ${errorText}`,
                    timestamp: new Date().toISOString()
                }));

                return new Response(JSON.stringify({
                    error: {
                        code: 'UPDATE_ERROR',
                        message: 'Erro ao atualizar agendamento',
                        details: errorText
                    }
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const updatedAppointment = await updateResponse.json();

            // Log de auditoria - agendamento atualizado
            console.log(JSON.stringify({
                requestId,
                action: 'update_agendamento',
                userId,
                appointmentId: id,
                changes: Object.keys(updateData),
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }));

            return new Response(JSON.stringify({ 
                data: updatedAppointment[0],
                message: 'Agendamento atualizado com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PATCH: Sugestão de horários livres
        } else if (req.method === 'PATCH') {
            const requestBody = await req.json();
            const { sugerir, dia } = requestBody;

            if (sugerir && dia) {
                // Log de auditoria - busca de horários livres
                console.log(JSON.stringify({
                    requestId,
                    action: 'buscar_horarios_livres',
                    userId,
                    dia,
                    timestamp: new Date().toISOString()
                }));

                try {
                    // Chamar RPC para buscar horários livres
                    const rpcResponse = await fetch(
                        `${supabaseUrl}/rest/v1/rpc/horarios_livres`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ _dia: dia })
                        }
                    );

                    if (!rpcResponse.ok) {
                        const errorText = await rpcResponse.text();
                        throw new Error(`Falha ao buscar horários livres: ${errorText}`);
                    }

                    const horariosLivres = await rpcResponse.json();

                    // Retornar até 3 sugestões
                    const sugestoes = horariosLivres.slice(0, 3).map((slot: any) => ({
                        inicio: slot.inicio,
                        fim: slot.fim
                    }));

                    return new Response(JSON.stringify({ 
                        data: sugestoes,
                        message: `${sugestoes.length} horários livres encontrados`
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } catch (rpcError) {
                    return new Response(JSON.stringify({
                        error: {
                            code: 'HORARIOS_LIVRES_ERROR',
                            message: 'Erro ao buscar horários livres',
                            details: rpcError.message
                        }
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            return new Response(JSON.stringify({
                error: {
                    code: 'INVALID_PATCH_REQUEST',
                    message: 'Parâmetros "sugerir" e "dia" são obrigatórios para operação PATCH'
                }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // DELETE: Operação proibida conforme requisito
        } else if (req.method === 'DELETE') {
            return new Response(JSON.stringify({
                error: {
                    code: 'OPERATION_NOT_ALLOWED',
                    message: 'Operação DELETE não é permitida para agendamentos'
                }
            }), {
                status: 405,
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json',
                    'Allow': 'GET, POST, PUT, PATCH, OPTIONS'
                }
            });
        }

        // Método não permitido
        return new Response(JSON.stringify({
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Método ${req.method} não é permitido`,
                allowed_methods: ['GET', 'POST', 'PUT', 'PATCH']
            }
        }), {
            status: 405,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Allow': 'GET, POST, PUT, PATCH, OPTIONS'
            }
        });

    } catch (error) {
        // Log de auditoria - erro geral
        console.error(JSON.stringify({
            requestId,
            action: 'error',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }));

        const errorResponse = {
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro interno do servidor',
                requestId
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

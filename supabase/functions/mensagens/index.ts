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

        console.log(JSON.stringify({
            requestId,
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        }));

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

        const userData = await userResponse.json();
        const userId = userData.id;

        // GET - Listar mensagens com filtros
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const origem = url.searchParams.get('origem'); // 'app' | 'whatsapp'
            const paciente_id = url.searchParams.get('paciente_id');
            const tipo = url.searchParams.get('tipo');
            const prioridade = url.searchParams.get('prioridade');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            // Construir query base para mensagens_app_paciente
            let query = `${supabaseUrl}/rest/v1/mensagens_app_paciente?select=*,paciente:pacientes(id,nome,telefone)&order=data_criacao.desc&limit=${limit}&offset=${offset}`;

            // Aplicar filtros
            if (origem) {
                // Para mensagens de origem 'app', buscar na tabela app_messages
                if (origem === 'app') {
                    query = `${supabaseUrl}/rest/v1/app_messages?select=*,paciente:pacientes(id,nome,telefone)&order=data_criacao.desc&limit=${limit}&offset=${offset}`;
                    if (paciente_id) query += `&paciente_id=eq.${paciente_id}`;
                    if (prioridade) query += `&urgencia=eq.${prioridade}`;
                } else if (origem === 'whatsapp') {
                    // Para mensagens de origem 'whatsapp', buscar na tabela whatsapp_messages
                    query = `${supabaseUrl}/rest/v1/whatsapp_messages?select=*,paciente:pacientes(id,nome,telefone)&order=created_at.desc&limit=${limit}&offset=${offset}`;
                    if (paciente_id) query += `&paciente_id=eq.${paciente_id}`;
                    if (tipo) query += `&categoria=eq.${tipo}`;
                }
            } else {
                // Se não especificar origem, buscar apenas em mensagens_app_paciente
                if (paciente_id) query += `&paciente_id=eq.${paciente_id}`;
                if (tipo) query += `&categoria=eq.${tipo}`;
                if (prioridade) query += `&urgencia=eq.${prioridade}`;
            }

            const response = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch messages: ${errorText}`);
            }

            const mensagens = await response.json();

            return new Response(JSON.stringify({ ok: true, data: mensagens }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // POST - Criar nova mensagem
        } else if (req.method === 'POST') {
            const { 
                paciente_id, 
                titulo, 
                conteudo, 
                origem = 'app', 
                tipo, 
                detalhes,
                enviado_para,
                prioridade = 'media',
                categoria = 'geral'
            } = await req.json();

            if (!paciente_id || !conteudo) {
                return new Response(JSON.stringify({ 
                    error: 'paciente_id e conteudo são obrigatórios' 
                }), { status: 400 });
            }

            let response, createdMessage;

            if (origem === 'app') {
                // Criar mensagem na tabela mensagens_app_paciente
                response = await fetch(`${supabaseUrl}/rest/v1/mensagens_app_paciente`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        paciente_id,
                        titulo: titulo || 'Nova mensagem',
                        conteudo,
                        categoria,
                        status: 'pendente',
                        urgencia: prioridade,
                        lida: false,
                        data_criacao: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to create app message: ${errorText}`);
                }

                createdMessage = await response.json();

            } else if (origem === 'whatsapp') {
                // Criar mensagem na tabela whatsapp_messages
                if (!tipo) {
                    return new Response(JSON.stringify({ 
                        error: 'tipo é obrigatório para mensagens WhatsApp' 
                    }), { status: 400 });
                }

                response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        paciente_id,
                        categoria: tipo,
                        conteudo,
                        template_id: detalhes?.template_id || null,
                        destinatario_telefone: enviado_para || '',
                        status_envio: 'pendente',
                        mensagem_origem: 'sistema',
                        created_at: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to create WhatsApp message: ${errorText}`);
                }

                createdMessage = await response.json();
            }

            console.log(JSON.stringify({
                requestId,
                action: 'create',
                origem,
                messageId: createdMessage[0]?.id,
                paciente_id,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ 
                ok: true, 
                id: createdMessage[0]?.id,
                data: createdMessage[0]
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PATCH - Marcar como lido e encaminhamento
        } else if (req.method === 'PATCH') {
            const { 
                id, 
                origem = 'app', 
                marcar_lida = false, 
                encaminhar_para,
                comentario_encaminhamento,
                novos_detalhes
            } = await req.json();

            if (!id) {
                throw new Error('Message ID is required for update');
            }

            let response, updateData, tableName;

            if (origem === 'app') {
                tableName = 'mensagens_app_paciente';
                updateData = {
                    updated_at: new Date().toISOString()
                };

                if (marcar_lida) {
                    updateData.lida = true;
                    updateData.data_resposta = new Date().toISOString();
                    updateData.respondido_por = userId;
                }

                if (encaminhar_para) {
                    updateData.encaminhamento_comentario = comentario_encaminhamento || '';
                    updateData.status = 'encaminhada';
                    
                    // Log de encaminhamento
                    console.log(JSON.stringify({
                        requestId,
                        action: 'forward',
                        messageId: id,
                        forwardedTo: encaminhar_para,
                        comentario: comentario_encaminhamento,
                        userId
                    }));
                }

                if (novos_detalhes) {
                    updateData.detalhes = novos_detalhes;
                }

            } else if (origem === 'whatsapp') {
                tableName = 'whatsapp_messages';
                updateData = {
                    updated_at: new Date().toISOString()
                };

                if (marcar_lida) {
                    // Para WhatsApp, marcar como entregue
                    updateData.status_envio = 'entregue';
                }

                if (encaminhar_para) {
                    // Para WhatsApp, criar nova mensagem encaminhada
                    const forwardResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            paciente_id: null, // Encaminhada para outro destinatário
                            categoria: 'encaminhamento',
                            conteudo: `Mensagem encaminhada por ${userId}: ${comentario_encaminhamento || 'Sem comentário'}`,
                            destinatario_telefone: encaminhar_para,
                            status_envio: 'pendente',
                            mensagem_origem: 'encaminhamento',
                            created_at: new Date().toISOString()
                        })
                    });

                    if (!forwardResponse.ok) {
                        const errorText = await forwardResponse.text();
                        throw new Error(`Failed to forward WhatsApp message: ${errorText}`);
                    }

                    // Log de encaminhamento WhatsApp
                    console.log(JSON.stringify({
                        requestId,
                        action: 'forward_whatsapp',
                        originalMessageId: id,
                        forwardedTo: encaminhar_para,
                        comentario: comentario_encaminhamento,
                        userId
                    }));

                    const forwardedMessage = await forwardResponse.json();
                    return new Response(JSON.stringify({ 
                        ok: true, 
                        message: 'Mensagem encaminhada com sucesso',
                        forwardedId: forwardedMessage[0]?.id
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update message: ${errorText}`);
            }

            const updatedMessage = await response.json();

            console.log(JSON.stringify({
                requestId,
                action: 'update',
                origem,
                messageId: id,
                changes: Object.keys(updateData),
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ 
                ok: true, 
                data: updatedMessage[0]
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PUT - Atualização completa de mensagem
        } else if (req.method === 'PUT') {
            const { 
                id, 
                origem = 'app',
                titulo, 
                conteudo, 
                status, 
                prioridade,
                detalhes
            } = await req.json();

            if (!id) {
                throw new Error('Message ID is required for update');
            }

            let tableName, response;

            if (origem === 'app') {
                tableName = 'mensagens_app_paciente';
            } else if (origem === 'whatsapp') {
                tableName = 'whatsapp_messages';
            } else {
                throw new Error('Invalid origem. Use "app" or "whatsapp"');
            }

            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (titulo !== undefined) updateData.titulo = titulo;
            if (conteudo !== undefined) updateData.conteudo = conteudo;
            if (status !== undefined) updateData.status = status;
            if (prioridade !== undefined) updateData.urgencia = prioridade;
            if (detalhes !== undefined) updateData.detalhes = detalhes;

            response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update message: ${errorText}`);
            }

            const updatedMessage = await response.json();

            return new Response(JSON.stringify({ 
                ok: true, 
                data: updatedMessage[0]
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // DELETE - Excluir mensagem (se permitido)
        } else if (req.method === 'DELETE') {
            const { id, origem = 'app' } = await req.json();

            if (!id) {
                throw new Error('Message ID is required for deletion');
            }

            let tableName;

            if (origem === 'app') {
                tableName = 'mensagens_app_paciente';
            } else if (origem === 'whatsapp') {
                tableName = 'whatsapp_messages';
            } else {
                throw new Error('Invalid origem. Use "app" or "whatsapp"');
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete message: ${errorText}`);
            }

            console.log(JSON.stringify({
                requestId,
                action: 'delete',
                origem,
                messageId: id,
                userId,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ 
                ok: true, 
                message: 'Mensagem excluída com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not allowed`);

    } catch (error) {
        console.error('Mensagens function error:', error);

        const errorResponse = {
            error: {
                code: 'MENSAGENS_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
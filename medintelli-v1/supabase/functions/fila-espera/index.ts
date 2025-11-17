Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH',
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

        console.log(JSON.stringify({
            requestId,
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        }));

        // Validação de autenticação (aceita ANON_KEY para sistema customizado)
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Cabeçalho de autorização não encontrado');
        }

        const token = authHeader.replace('Bearer ', '');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        let userId = 'system'; // Default para chamadas com ANON_KEY

        // Se não for ANON_KEY, validar como usuário autenticado
        if (token !== anonKey) {
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!userResponse.ok) {
                throw new Error('Token inválido ou expirado');
            }

            const userData = await userResponse.json();
            userId = userData.id;
        }

        // GET: Listar registros da fila de espera
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const status = url.searchParams.get('status') || 'aguardando';
            const ordenar = url.searchParams.get('ordenar') || 'pos.asc';
            const limite = url.searchParams.get('limite') || '50';
            const offset = url.searchParams.get('offset') || '0';

            let query = `${supabaseUrl}/rest/v1/fila_espera?select=*,paciente:pacientes(id,nome,telefone),agendamento:agendamentos(id,inicio,status)&status=eq.${status}&order=${ordenar}&limit=${limite}&offset=${offset}`;

            // Se há ordenação personalizada via JSONB
            const ordenacaoParam = url.searchParams.get('ordenacao');
            if (ordenacaoParam) {
                try {
                    const ordenacao = JSON.parse(ordenacaoParam);
                    if (Array.isArray(ordenacao) && ordenacao.length > 0) {
                        // Aplicar ordenação personalizada
                        const orderBy = ordenacao.map(item => 
                            `${item.campo}.${item.direcao || 'asc'}`
                        ).join(',');
                        query = query.replace(`order=${ordenar}`, `order=${orderBy}`);
                    }
                } catch (e) {
                    console.warn('Parâmetro ordenação inválido, usando ordenação padrão');
                }
            }

            const response = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha ao buscar fila de espera: ${errorText}`);
            }

            const fila = await response.json();
            const totalCount = response.headers.get('Content-Range')?.split('/')[1];

            return new Response(JSON.stringify({ 
                ok: true, 
                data: fila,
                pagination: {
                    total: totalCount ? parseInt(totalCount) : fila.length,
                    limit: parseInt(limite),
                    offset: parseInt(offset)
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // POST: Inclusão com campo paciente_novo para cadastro rápido
        } else if (req.method === 'POST') {
            const requestBody = await req.json();
            const { 
                paciente_id, 
                paciente_novo, 
                motivo, 
                prioridade,
                nome,           // Campo direto para compatibilidade
                telefone,       // Campo direto para compatibilidade
                observacoes 
            } = requestBody;

            // Validação básica
            if (!paciente_id && !paciente_novo?.nome && !nome) {
                return new Response(JSON.stringify({ 
                    error: 'Informe paciente_id, paciente_novo.nome ou nome' 
                }), { status: 400 });
            }

            let pid = paciente_id;

            // Se não há paciente_id, verificar cadastro rápido
            if (!pid) {
                // Compatibilidade com campo nome/telefone direto
                if (nome) {
                    paciente_novo = {
                        nome: nome,
                        telefone: telefone || '',
                        convenio: requestBody.convenio || 'PARTICULAR'
                    };
                }

                if (paciente_novo?.nome) {
                    // Validar dados do paciente novo
                    if (!paciente_novo.nome.trim()) {
                        throw new Error('Nome do paciente é obrigatório');
                    }

                    // Verificar se já existe paciente com mesmo nome e telefone
                    const searchResponse = await fetch(
                        `${supabaseUrl}/rest/v1/pacientes?nome=ilike.%${encodeURIComponent(paciente_novo.nome)}%&telefone=eq.${encodeURIComponent(paciente_novo.telefone || '')}&limit=1`, 
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );

                    const existingPatients = await searchResponse.json();
                    if (existingPatients.length > 0) {
                        pid = existingPatients[0].id;
                        console.log(`Usando paciente existente: ${pid}`);
                    } else {
                        // Criar novo paciente
                        const createResponse = await fetch(`${supabaseUrl}/rest/v1/pacientes`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify({
                                nome: paciente_novo.nome.trim(),
                                telefone: paciente_novo.telefone || '',
                                convenio: paciente_novo.convenio || 'PARTICULAR',
                                ativo: true,
                                observacoes: paciente_novo.observacoes || null
                            })
                        });

                        if (!createResponse.ok) {
                            const errorText = await createResponse.text();
                            throw new Error(`Falha ao criar paciente: ${errorText}`);
                        }

                        const novo = await createResponse.json();
                        pid = novo[0].id;
                        console.log(`Novo paciente criado: ${pid}`);
                    }
                }
            }
            
            if (!pid) {
                throw new Error('Não foi possível identificar o paciente');
            }

            // Calcular próxima posição
            const maxPosResponse = await fetch(
                `${supabaseUrl}/rest/v1/fila_espera?status=eq.aguardando&select=pos&order=pos.desc&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const maxPosData = await maxPosResponse.json();
            const proximaPosicao = (maxPosData.length > 0 ? maxPosData[0].pos : 0) + 1;

            // Criar item na fila
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ 
                    paciente_id: pid, 
                    motivo: motivo || null,
                    prioridade: prioridade || 'normal',
                    observacoes: observacoes || null,
                    pos: proximaPosicao,
                    status: 'aguardando'
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Falha ao criar item na fila: ${errorText}`);
            }

            const createdItem = await createResponse.json();

            console.log(JSON.stringify({
                requestId,
                action: 'create',
                itemId: createdItem[0].id,
                pacienteId: pid,
                position: proximaPosicao,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ 
                ok: true, 
                id: createdItem[0].id,
                message: 'Item adicionado à fila com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PUT: Atualizações completas de registros existentes
        } else if (req.method === 'PUT') {
            const requestBody = await req.json();
            const { 
                id, 
                paciente_id,
                nome,           // Para atualização de dados do paciente
                telefone,       // Para atualização de dados do paciente
                observacoes,
                motivo,
                prioridade,
                status
            } = requestBody;

            if (!id) {
                throw new Error('ID do item é obrigatório para atualização');
            }

            // Verificar se o item existe
            const itemResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${id}&select=*`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            const items = await itemResponse.json();
            if (items.length === 0) {
                throw new Error('Item não encontrado');
            }

            const currentItem = items[0];

            const updateData: any = {
                updated_at: new Date().toISOString(),
                data_ultima_atualizacao: new Date().toISOString()
            };

            // Campos para atualização
            if (observacoes !== undefined) updateData.observacoes = observacoes;
            if (motivo !== undefined) updateData.motivo = motivo;
            if (prioridade !== undefined) updateData.prioridade = prioridade;
            if (status !== undefined) updateData.status = status;

            // Se há dados do paciente para atualizar
            if (nome !== undefined || telefone !== undefined) {
                const pacienteUpdateData: any = {};
                if (nome !== undefined) pacienteUpdateData.nome = nome;
                if (telefone !== undefined) pacienteUpdateData.telefone = telefone;

                const pacienteResponse = await fetch(`${supabaseUrl}/rest/v1/pacientes?id=eq.${currentItem.paciente_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pacienteUpdateData)
                });

                if (!pacienteResponse.ok) {
                    const errorText = await pacienteResponse.text();
                    throw new Error(`Falha ao atualizar dados do paciente: ${errorText}`);
                }
            }

            // Atualizar score de prioridade se necessário
            if (prioridade) {
                switch (prioridade) {
                    case 'urgente': updateData.score_prioridade = 100; break;
                    case 'alta': updateData.score_prioridade = 75; break;
                    case 'media': updateData.score_prioridade = 50; break;
                    case 'baixa': updateData.score_prioridade = 25; break;
                    default: updateData.score_prioridade = 0; break;
                }
            }

            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${id}`, {
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
                throw new Error(`Falha ao atualizar item: ${errorText}`);
            }

            const updatedItem = await updateResponse.json();

            console.log(JSON.stringify({
                requestId,
                action: 'update',
                itemId: id,
                changes: Object.keys(updateData),
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({ 
                data: updatedItem[0],
                message: 'Item atualizado com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        // PATCH: Atualizações parciais e reordenação
        } else if (req.method === 'PATCH') {
            const body = await req.json();

            // Verificar se é reordenação em lote com ordenação personalizada
            if (body.ordenacao && Array.isArray(body.ordenacao)) {
                // Reordenação em lote com suporte a ordenação personalizada (JSONB)
                const { ordenacao } = body;
                
                if (!ordenacao || ordenacao.length === 0) {
                    throw new Error('Array de ordenação é obrigatório');
                }

                // Validar estrutura da ordenação
                for (const item of ordenacao) {
                    if (!item.id || item.pos === undefined) {
                        throw new Error('Cada item na ordenação deve ter id e pos');
                    }
                }
                
                const updates = ordenacao.map(({ id, pos, ...extraData }) => {
                    const update: any = {
                        id,
                        pos,
                        posicao_atual: pos,
                        data_ultima_atualizacao: new Date().toISOString()
                    };

                    // Se há dados extras de ordenação (JSONB)
                    if (Object.keys(extraData).length > 0) {
                        update.ordenacao = extraData;
                    }

                    return update;
                });
                
                let successCount = 0;
                let errorCount = 0;
                const errors = [];
                
                // Aplicar atualizações em sequência
                for (const update of updates) {
                    try {
                        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${update.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                pos: update.pos,
                                posicao_atual: update.posicao_atual,
                                data_ultima_atualizacao: update.data_ultima_atualizacao,
                                ...(update.ordenacao && { ordenacao: update.ordenacao })
                            })
                        });
                        
                        if (updateResponse.ok) {
                            successCount++;
                        } else {
                            const errorText = await updateResponse.text();
                            errorCount++;
                            errors.push(`Item ${update.id}: ${errorText}`);
                        }
                    } catch (error) {
                        errorCount++;
                        errors.push(`Item ${update.id}: ${error.message}`);
                    }
                }
                
                console.log(JSON.stringify({
                    requestId,
                    action: 'bulk_reorder',
                    total: ordenacao.length,
                    success: successCount,
                    errors: errorCount,
                    duration: Date.now() - startTime
                }));

                if (errorCount > 0) {
                    return new Response(JSON.stringify({
                        success: successCount > 0,
                        message: `${successCount} itens atualizados, ${errorCount} erros`,
                        data: {
                            total: ordenacao.length,
                            success: successCount,
                            errors: errorCount,
                            errorDetails: errors
                        }
                    }), {
                        status: errorCount === ordenacao.length ? 500 : 207, // 207 = Multi-Status
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Nova ordem persistida com sucesso',
                    data: {
                        total: ordenacao.length,
                        success: successCount,
                        errors: 0
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } else if (body.fila_espera_id) {
                // Agendamento a partir da fila de espera
                const { 
                    fila_espera_id,
                    agendamento_data,
                    agendamento_hora,
                    agendamento_duracao,
                    agendamento_tipo,
                    agendamento_observacoes,
                    profissional_id
                } = body;

                if (!fila_espera_id) {
                    throw new Error('ID da fila de espera é obrigatório para agendamento');
                }

                // Buscar item da fila
                const filaResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${fila_espera_id}&select=*`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                const filaItems = await filaResponse.json();
                if (filaItems.length === 0) {
                    throw new Error('Item da fila não encontrado');
                }

                const filaItem = filaItems[0];

                // Criar agendamento
                const agendamentoResponse = await fetch(`${supabaseUrl}/rest/v1/agendamentos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        paciente_id: filaItem.paciente_id,
                        inicio: `${agendamento_data}T${agendamento_hora}:00`,
                        fim: `${agendamento_data}T${agendamento_hora}:00`,
                        duracao: agendamento_duracao || 30,
                        tipo: agendamento_tipo || 'CONSULTA',
                        status: 'agendado',
                        observacoes: agendamento_observacoes || null,
                        profissional_id: profissional_id || null
                    })
                });

                if (!agendamentoResponse.ok) {
                    const errorText = await agendamentoResponse.text();
                    throw new Error(`Falha ao criar agendamento: ${errorText}`);
                }

                const agendamento = await agendamentoResponse.json();

                // Atualizar fila para marcar como agendado
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${fila_espera_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'agendado',
                        agendamento_id: agendamento[0].id,
                        data_agendamento: agendamento_data,
                        observacoes: `Agendado para ${agendamento_data} às ${agendamento_hora}`,
                        data_ultima_atualizacao: new Date().toISOString()
                    })
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Falha ao atualizar fila: ${errorText}`);
                }

                console.log(JSON.stringify({
                    requestId,
                    action: 'create_appointment',
                    filaId: fila_espera_id,
                    agendamentoId: agendamento[0].id,
                    duration: Date.now() - startTime
                }));

                return new Response(JSON.stringify({ 
                    ok: true,
                    message: 'Agendamento criado com sucesso',
                    data: {
                        agendamento: agendamento[0],
                        fila_item: filaItem
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } else {
                // Atualização parcial individual ou reordenação simples
                const { 
                    id, 
                    nova_posicao, 
                    observacoes, 
                    motivo, 
                    prioridade,
                    status,
                    ...extraFields 
                } = body;

                if (!id) {
                    throw new Error('ID do item é obrigatório para atualização parcial');
                }

                const updateData: any = {
                    data_ultima_atualizacao: new Date().toISOString()
                };

                // Campos que podem ser atualizados
                if (observacoes !== undefined) updateData.observacoes = observacoes;
                if (motivo !== undefined) updateData.motivo = motivo;
                if (prioridade !== undefined) updateData.prioridade = prioridade;
                if (status !== undefined) updateData.status = status;

                // Atualizar score de prioridade
                if (prioridade) {
                    switch (prioridade) {
                        case 'urgente': updateData.score_prioridade = 100; break;
                        case 'alta': updateData.score_prioridade = 75; break;
                        case 'media': updateData.score_prioridade = 50; break;
                        case 'baixa': updateData.score_prioridade = 25; break;
                    }
                }

                // Se há campos extras (para ordenação JSONB)
                if (Object.keys(extraFields).length > 0) {
                    updateData.ordenacao = extraFields;
                }

                // Se há nova posição, atualizar posição
                if (nova_posicao !== undefined) {
                    updateData.pos = nova_posicao;
                    updateData.posicao_atual = nova_posicao;
                }

                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/fila_espera?id=eq.${id}`, {
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
                    throw new Error(`Falha ao atualizar item: ${errorText}`);
                }

                const updatedItem = await updateResponse.json();

                console.log(JSON.stringify({
                    requestId,
                    action: 'partial_update',
                    itemId: id,
                    changes: Object.keys(updateData),
                    duration: Date.now() - startTime
                }));

                return new Response(JSON.stringify({ 
                    data: updatedItem[0],
                    message: 'Item atualizado com sucesso'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Método não permitido
        throw new Error(`Método ${req.method} não permitido. Métodos aceitos: GET, POST, PUT, PATCH`);

    } catch (error) {
        console.error('Erro na função fila de espera:', error);

        const errorResponse = {
            error: {
                code: 'FILA_ESPERA_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        const status = error.message.includes('não encontrado') ? 404 :
                      error.message.includes('obrigatório') ? 400 :
                      error.message.includes('Token inválido') ? 401 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
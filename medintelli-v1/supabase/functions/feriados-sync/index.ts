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

        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL não configurado');
        }
        
        if (!serviceRoleKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
        }

        const requestId = crypto.randomUUID();
        const startTime = Date.now();

        console.log(JSON.stringify({
            requestId,
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        }));

        // Obter usuário do cabeçalho de autorização (aceita ANON_KEY para sistema customizado)
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
                throw new Error('Token inválido');
            }

            const userData = await userResponse.json();
            userId = userData.id;
        }

        // GET: Listar feriados do sistema
        if (req.method === 'GET') {
            const url = new URL(req.url);
            constano = url.searchParams.get('ano');
            const tipo = url.searchParams.get('tipo'); // 'nacional' ou 'municipal'
            const recorrente = url.searchParams.get('recorrente'); // 'true' ou 'false'
            
            let query = `${supabaseUrl}/rest/v1/feriados?select=*&order=data.asc`;
            
            // Aplicar filtros
            if (ano) {
                query += `&data=gte.${ano}-01-01&data=lte.${ano}-12-31`;
            }
            if (tipo) {
                query += `&escopo=eq.${tipo}`;
            }
            if (recorrente !== null && recorrente !== undefined) {
                query += `&recorrente=eq.${recorrente}`;
            }

            const response = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao buscar feriados: ${response.statusText}`);
            }

            const feriados = await response.json();

            console.log(JSON.stringify({
                requestId,
                action: 'list_feriados',
                count: feriados.length,
                filters: { ano, tipo, recorrente },
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: feriados
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // POST: Operações de sincronização
        if (req.method === 'POST') {
            const { action, feriados } = await req.json();

            if (action === 'sync') {
                const currentYear = new Date().getFullYear();
                let feriadosParaSync = feriados;

                // Se não foi fornecida lista personalizada, buscar da Brasil API
                if (!feriados || feriados.length === 0) {
                    try {
                        const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/feriados/v1/${currentYear}`);
                        
                        if (!brasilApiResponse.ok) {
                            throw new Error(`Erro ao buscar feriados da Brasil API: ${brasilApiResponse.statusText}`);
                        }
                        
                        const brasilFeriados = await brasilApiResponse.json();
                        feriadosParaSync = brasilFeriados.map((feriado: any) => {
                            // Calcular mes e dia_mes a partir da data
                            const dateParts = feriado.date.split('-');
                            const dia = parseInt(dateParts[2]);
                            const mes = parseInt(dateParts[1]);
                            
                            return {
                                dia: dia,
                                mes: mes,
                                titulo: feriado.name,
                                escopo: 'nacional',
                                recorrente: false // Feriados da API podem não ser recorrentes
                            };
                        });
                    } catch (error) {
                        console.error('Erro ao buscar feriados da Brasil API, usando lista padrão:', error);
                        
                        // Lista de feriados nacionais recorrentes anuais como fallback
                        feriadosParaSync = [
                            { dia: 1, mes: 1, titulo: 'Confraternização Universal', escopo: 'nacional', recorrente: true },
                            { dia: 21, mes: 4, titulo: 'Tiradentes', escopo: 'nacional', recorrente: true },
                            { dia: 1, mes: 5, titulo: 'Dia do Trabalho', escopo: 'nacional', recorrente: true },
                            { dia: 7, mes: 9, titulo: 'Independência do Brasil', escopo: 'nacional', recorrente: true },
                            { dia: 12, mes: 10, titulo: 'Nossa Senhora Aparecida', escopo: 'nacional', recorrente: true },
                            { dia: 2, mes: 11, titulo: 'Finados', escopo: 'nacional', recorrente: true },
                            { dia: 15, mes: 11, titulo: 'Proclamação da República', escopo: 'nacional', recorrente: true },
                            { dia: 25, mes: 12, titulo: 'Natal', escopo: 'nacional', recorrente: true }
                        ];
                    }
                }

                const syncResults = {
                    created: 0,
                    updated: 0,
                    errors: 0,
                    totalProcessed: 0,
                    fromBrasilAPI: !!feriados && feriados.length === 0
                };

                // Usar lista fornecida ou obtida da API/fallback
                for (const feriado of feriadosParaSync) {
                    try {
                        // Calcular mes e dia_mes se não fornecidos
                        let dia_mes = feriado.dia;
                        let mes = feriado.mes;
                        
                        if (!dia_mes || !mes && feriado.data) {
                            const dateParts = feriado.data.split('-');
                            dia_mes = parseInt(dateParts[2]);
                            mes = parseInt(dateParts[1]);
                        }

                        if (!dia_mes || !mes) {
                            throw new Error(`Dados insuficientes para calcular data: ${JSON.stringify(feriado)}`);
                        }

                        const dateString = `${currentYear}-${String(mes).padStart(2, '0')}-${String(dia_mes).padStart(2, '0')}`;

                        // UPSERT usando o endpoint do Supabase com resolução de conflitos
                        const upsertData = {
                            data: dateString,
                            titulo: feriado.titulo,
                            escopo: feriado.escopo || 'nacional',
                            recorrente: feriado.recorrente !== undefined ? feriado.recorrente : true,
                            dia_mes: dia_mes,
                            mes: mes,
                            uf: feriado.uf || null,
                            municipio: feriado.municipio || null,
                            created_by: userId,
                            updated_at: new Date().toISOString()
                        };

                        const upsertResponse = await fetch(
                            `${supabaseUrl}/rest/v1/feriados`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal,resolution=merge-duplicates'
                                },
                                body: JSON.stringify(upsertData)
                            }
                        );

                        if (upsertResponse.ok) {
                            // Verificar se foi criado ou atualizado
                            const checkResponse = await fetch(
                                `${supabaseUrl}/rest/v1/feriados?data=eq.${dateString}&select=id`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey
                                    }
                                }
                            );

                            const existing = await checkResponse.json();
                            if (existing.length > 0) {
                                syncResults.updated++;
                            } else {
                                syncResults.created++;
                            }
                        } else {
                            const errorText = await upsertResponse.text();
                            console.error(`Erro no upsert do feriado ${feriado.titulo}:`, errorText);
                            
                            // Tentar UPDATE como fallback
                            const updateResponse = await fetch(
                                `${supabaseUrl}/rest/v1/feriados?data=eq.${dateString}`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json',
                                        'Prefer': 'return=minimal'
                                    },
                                    body: JSON.stringify({
                                        titulo: feriado.titulo,
                                        escopo: feriado.escopo || 'nacional',
                                        recorrente: feriado.recorrente !== undefined ? feriado.recorrente : true,
                                        dia_mes: dia_mes,
                                        mes: mes,
                                        uf: feriado.uf || null,
                                        municipio: feriado.municipio || null,
                                        updated_at: new Date().toISOString()
                                    })
                                }
                            );

                            if (updateResponse.ok) {
                                syncResults.updated++;
                            } else {
                                syncResults.errors++;
                            }
                        }
                        syncResults.totalProcessed++;
                    } catch (error) {
                        syncResults.errors++;
                        console.error(`Erro ao processar feriado ${feriado.titulo || 'desconhecido'}:`, error.message);
                    }
                }

                console.log(JSON.stringify({
                    requestId,
                    action: 'sync_feriados',
                    results: syncResults,
                    year: currentYear,
                    duration: Date.now() - startTime
                }));

                return new Response(JSON.stringify({
                    data: {
                        message: 'Sincronização de feriados concluída',
                        results: syncResults,
                        year: currentYear
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                throw new Error(`Ação POST não reconhecida: ${action}`);
            }
        }

        // PUT: Edição de feriados com suporte a recorrência
        if (req.method === 'PUT') {
            const { 
                id, 
                data, 
                titulo, 
                recorrente, 
                escopo, 
                uf, 
                municipio, 
                dia_mes, 
                mes 
            } = await req.json();

            // Validações
            if (!id) {
                throw new Error('ID do feriado é obrigatório para edição');
            }

            if (!titulo || titulo.trim().length === 0) {
                throw new Error('Título do feriado é obrigatório');
            }

            if (escopo && !['nacional', 'municipal'].includes(escopo)) {
                throw new Error('Escopo deve ser "nacional" ou "municipal"');
            }

            // Validar data se fornecida
            if (data) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(data)) {
                    throw new Error('Data deve estar no formato YYYY-MM-DD');
                }

                const dateObj = new Date(data);
                if (isNaN(dateObj.getTime())) {
                    throw new Error('Data inválida');
                }
            }

            // Validar recorrência
            if (recorrente && dia_mes && mes) {
                if (dia_mes < 1 || dia_mes > 31) {
                    throw new Error('Dia do mês deve estar entre 1 e 31');
                }
                if (mes < 1 || mes > 12) {
                    throw new Error('Mês deve estar entre 1 e 12');
                }
            }

            // Verificar conflitos de data (exceto para o próprio feriado sendo editado)
            if (data && titulo) {
                const conflictCheck = await fetch(
                    `${supabaseUrl}/rest/v1/feriados?data=eq.${data}&id=neq.${id}&select=id,titulo`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const conflicts = await conflictCheck.json();
                if (conflicts.length > 0) {
                    throw new Error(`Já existe um feriado cadastrado para esta data: ${conflicts[0].titulo}`);
                }
            }

            // Preparar dados para atualização
            const updateData: any = {
                titulo: titulo.trim(),
                updated_at: new Date().toISOString()
            };

            if (data) updateData.data = data;
            if (recorrente !== undefined) updateData.recorrente = recorrente;
            if (escopo) updateData.escopo = escopo;
            if (uf) updateData.uf = uf;
            if (municipio) updateData.municipio = municipio;
            if (dia_mes !== undefined) updateData.dia_mes = dia_mes;
            if (mes !== undefined) updateData.mes = mes;

            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/feriados?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Falha ao atualizar feriado: ${errorText}`);
            }

            console.log(JSON.stringify({
                requestId,
                action: 'update_feriado',
                id,
                titulo,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    message: 'Feriado atualizado com sucesso',
                    id,
                    titulo
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // DELETE: Remoção de feriados (com ID via query param)
        if (req.method === 'DELETE') {
            const url = new URL(req.url);
            const id = url.searchParams.get('id');
            
            if (!id) {
                throw new Error('ID do feriado é obrigatório para exclusão');
            }

            // Verificar se o feriado existe antes de excluir
            const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/feriados?id=eq.${id}&select=id,titulo,data`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existing = await checkResponse.json();
            if (existing.length === 0) {
                throw new Error('Feriado não encontrado');
            }

            const feriado = existing[0];

            // Verificar se há agendamentos para este feriado
            const agendamentosCheck = await fetch(
                `${supabaseUrl}/rest/v1/agendamentos?data_agendamento=eq.${feriado.data}&status=not.in.(cancelado,concluido)&select=id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const agendamentos = await agendamentosCheck.json();
            if (agendamentos.length > 0) {
                throw new Error(`Não é possível excluir este feriado pois existem ${agendamentos.length} agendamento(s) associado(s)`);
            }

            const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/feriados?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'return=minimal'
                }
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                throw new Error(`Falha ao excluir feriado: ${errorText}`);
            }

            console.log(JSON.stringify({
                requestId,
                action: 'delete_feriado',
                id,
                titulo: feriado.titulo,
                data: feriado.data,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    message: 'Feriado excluído com sucesso',
                    id,
                    titulo: feriado.titulo
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Método não suportado
        throw new Error(`Método ${req.method} não suportado`);

    } catch (error) {
        const requestId = crypto.randomUUID();
        console.error(`Erro na função de feriados [${requestId}]:`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        const errorResponse = {
            error: {
                code: 'FERIADOS_ERROR',
                message: error.message,
                requestId: requestId,
                timestamp: new Date().toISOString()
            }
        };

        // Determinar status code baseado no tipo de erro
        const status = error.message.includes('SUPABASE_SERVICE_ROLE_KEY não configurado') || 
                      error.message.includes('SUPABASE_URL não configurado') ? 500 :
                      error.message.includes('Token inválido') || 
                      error.message.includes('Cabeçalho de autorização') ? 401 :
                      error.message.includes('não encontrado') ? 404 :
                      error.message.includes('obrigatório') || 
                      error.message.includes('inválida') ? 400 :
                      error.message.includes('conflito') || 
                      error.message.includes('já existe') ? 409 :
                      error.message.includes('Brasil API') ? 502 :
                      error.message.includes('Timeout') || 
                      error.message.includes('Network') ? 503 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

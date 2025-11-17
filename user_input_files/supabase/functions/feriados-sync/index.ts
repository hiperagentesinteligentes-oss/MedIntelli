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

        // Obter usuário do cabeçalho de autorização
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Cabeçalho de autorização não encontrado');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verificar token e obter usuário
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
        const userId = userData.id;

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

                // Lista de feriados nacionais recorrentes anuais
                const feriadosNacionais = [
                    { dia: 1, mes: 1, titulo: 'Confraternização Universal', escopo: 'nacional' },
                    { dia: 21, mes: 4, titulo: 'Tiradentes', escopo: 'nacional' },
                    { dia: 1, mes: 5, titulo: 'Dia do Trabalho', escopo: 'nacional' },
                    { dia: 7, mes: 9, titulo: 'Independência do Brasil', escopo: 'nacional' },
                    { dia: 12, mes: 10, titulo: 'Nossa Senhora Aparecida', escopo: 'nacional' },
                    { dia: 2, mes: 11, titulo: 'Finados', escopo: 'nacional' },
                    { dia: 15, mes: 11, titulo: 'Proclamação da República', escopo: 'nacional' },
                    { dia: 25, mes: 12, titulo: 'Natal', escopo: 'nacional' }
                ];

                const syncResults = {
                    created: 0,
                    updated: 0,
                    errors: 0,
                    totalProcessed: 0
                };

                // Usar lista fornecida ou padrão
                const feriadosParaSync = feriados || feriadosNacionais;

                for (const feriado of feriadosParaSync) {
                    try {
                        const dateString = `${currentYear}-${String(feriado.mes).padStart(2, '0')}-${String(feriado.dia).padStart(2, '0')}`;
                        const dataFeriado = `${feriado.dia.toString().padStart(2, '0')}/${feriado.mes.toString().padStart(2, '0')}/${currentYear}`;

                        // Verificar se já existe para este ano
                        const checkResponse = await fetch(
                            `${supabaseUrl}/rest/v1/feriados?data=eq.${dateString}&select=id,data,titulo`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey
                                }
                            }
                        );

                        const existing = await checkResponse.json();

                        if (existing.length > 0) {
                            // Atualizar existente com upsert
                            const updateData = {
                                titulo: feriado.titulo,
                                escopo: feriado.escopo,
                                recorrente: true,
                                dia_mes: feriado.dia,
                                mes: feriado.mes,
                                uf: feriado.uf || null,
                                municipio: feriado.municipio || null,
                                created_by: userId,
                                updated_at: new Date().toISOString()
                            };

                            const updateResponse = await fetch(
                                `${supabaseUrl}/rest/v1/feriados?id=eq.${existing[0].id}`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json',
                                        'Prefer': 'return=minimal'
                                    },
                                    body: JSON.stringify(updateData)
                                }
                            );

                            if (updateResponse.ok) {
                                syncResults.updated++;
                            } else {
                                syncResults.errors++;
                                console.error(`Erro ao atualizar feriado ${feriado.titulo}:`, await updateResponse.text());
                            }
                        } else {
                            // Criar novo feriado recorrente anual
                            const createData = {
                                data: dateString,
                                titulo: feriado.titulo,
                                escopo: feriado.escopo,
                                recorrente: true,
                                dia_mes: feriado.dia,
                                mes: feriado.mes,
                                uf: feriado.uf || null,
                                municipio: feriado.municipio || null,
                                created_by: userId
                            };

                            const createResponse = await fetch(`${supabaseUrl}/rest/v1/feriados`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal'
                                },
                                body: JSON.stringify(createData)
                            });

                            if (createResponse.ok) {
                                syncResults.created++;
                            } else {
                                syncResults.errors++;
                                console.error(`Erro ao criar feriado ${feriado.titulo}:`, await createResponse.text());
                            }
                        }
                        syncResults.totalProcessed++;
                    } catch (error) {
                        syncResults.errors++;
                        console.error(`Erro ao processar feriado ${feriado.titulo}:`, error);
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
        console.error('Erro na função de feriados:', error);

        const errorResponse = {
            error: {
                code: 'FERIADOS_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        const status = error.message.includes('Token inválido') || 
                      error.message.includes('Cabeçalho de autorização') ? 401 :
                      error.message.includes('não encontrado') ? 404 :
                      error.message.includes('obrigatório') || 
                      error.message.includes('inválida') ? 400 :
                      error.message.includes('conflito') || 
                      error.message.includes('já existe') ? 409 : 500;

        return new Response(JSON.stringify(errorResponse), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

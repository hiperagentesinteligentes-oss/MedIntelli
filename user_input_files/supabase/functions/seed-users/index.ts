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
            // Usuários para criar conforme especificação
            const users = [
                {
                    email: 'silvia@medintelli.com.br',
                    password: 'senha123',
                    nome: 'Silvia',
                    perfil: 'administrador'
                },
                {
                    email: 'gabriel@medintelli.com.br',
                    password: 'senha123',
                    nome: 'Gabriel',
                    perfil: 'auxiliar'
                },
                {
                    email: 'natashia@medintelli.com.br',
                    password: 'senha123',
                    nome: 'Natashia',
                    perfil: 'secretaria'
                },
                {
                    email: 'drfrancisco@medintelli.com.br',
                    password: 'senha123',
                    nome: 'Dr. Francisco',
                    perfil: 'medico'
                },
                {
                    email: 'admin@medintelli.com.br',
                    password: 'MedIntelli2024!',
                    nome: 'Super Admin',
                    perfil: 'super_admin'
                }
            ];

            const createdUsers = [];
            const errors = [];

            for (const user of users) {
                try {
                    // Criar usuário no auth do Supabase
                    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: user.email,
                            password: user.password,
                            email_confirm: true,
                            user_metadata: {
                                nome: user.nome,
                                perfil: user.perfil
                            }
                        })
                    });

                    if (!authResponse.ok) {
                        const errorText = await authResponse.text();
                        // Se o usuário já existe, continuar
                        if (errorText.includes('already registered')) {
                            console.log(`User ${user.email} already exists, skipping`);
                            continue;
                        }
                        throw new Error(`Auth creation failed: ${errorText}`);
                    }

                    const authUser = await authResponse.json();

                    // Inserir perfil na tabela user_profiles
                    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            id: authUser.id,
                            nome: user.nome,
                            perfil: user.perfil
                        })
                    });

                    if (!profileResponse.ok) {
                        const errorText = await profileResponse.text();
                        throw new Error(`Profile creation failed: ${errorText}`);
                    }

                    const profile = await profileResponse.json();

                    createdUsers.push({
                        id: authUser.id,
                        email: user.email,
                        nome: user.nome,
                        perfil: user.perfil,
                        profileId: profile[0]?.id
                    });

                    console.log(`Created user: ${user.email} (${user.perfil})`);

                } catch (userError) {
                    errors.push({
                        email: user.email,
                        error: userError.message
                    });
                    console.error(`Error creating user ${user.email}:`, userError);
                }
            }

            // Criar alguns pacientes de teste
            const testPatients = [
                {
                    nome: 'João Silva',
                    email: 'joao@email.com',
                    telefone: '+5516999999999',
                    data_nascimento: '1990-05-15',
                    convenio: 'Particular'
                },
                {
                    nome: 'Maria Santos',
                    email: 'maria@email.com',
                    telefone: '+5516988888888',
                    data_nascimento: '1985-08-22',
                    convenio: 'Unimed'
                },
                {
                    nome: 'Pedro Oliveira',
                    email: 'pedro@email.com',
                    telefone: '+5516977777777',
                    data_nascimento: '1978-12-10',
                    convenio: 'Particular'
                }
            ];

            const createdPatients = [];
            for (const patient of testPatients) {
                try {
                    const patientResponse = await fetch(`${supabaseUrl}/rest/v1/pacientes`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(patient)
                    });

                    if (patientResponse.ok) {
                        const createdPatient = await patientResponse.json();
                        createdPatients.push(createdPatient[0]);
                        console.log(`Created patient: ${patient.nome}`);
                    }
                } catch (patientError) {
                    console.error(`Error creating patient ${patient.nome}:`, patientError);
                }
            }

            // Inserir conhecimento inicial na BUC
            const knowledgeContent = `Base de Conhecimento MedIntelli

INFORMAÇÕES DA CLÍNICA:
- Nome: MedIntelli
- Localização: São Paulo, SP
- Médico Responsável: Dr. Francisco
- Telefone: +55 16 98870-7777

ESPECIALIDADES:
- Consultas gerais
- Acompanhamento médico
- Exames preventivos
- Consultas de retorno

HORÁRIOS DE FUNCIONAMENTO:
- Segunda a Sexta: 08:00 às 18:00
- Sábado: 08:00 às 12:00
- Domingo: Fechado

POLÍTICAS:
- Cancelamentos com 24h de antecedência
- Chegada 15 minutos antes da consulta
- Documentos necessários: RG, CPF, Cartão do convênio
- Para emergências, entrar em contato via WhatsApp

TIPOS DE CONSULTA:
1. Consulta Normal (40 minutos)
2. Retorno (30 minutos)
3. Consulta de Emergência (mesmo dia)
4. Consulta Preventiva (45 minutos)

REGRAS DE AGENDAMENTO:
- Horários disponíveis: 08:00, 08:40, 09:20, 10:00, 10:40, 11:20, 14:00, 14:40, 15:20, 16:00, 16:40, 17:20
- Não há agendamento aos finais de semana
- Feriados nacionais não têm atendimento
- Pacientes podem agendar via WhatsApp ou aplicativo
- Confirmar agendamento 24h antes via WhatsApp

COMUNICAÇÃO:
- WhatsApp: +55 16 98870-7777
- Email: contato@medintelli.com.br
- App: Disponível para Android e iOS
- Resposta WhatsApp: 2h em horário comercial

PESSOAS AUTORIZADAS:
- Silvia (ADMIN): Gestão completa do sistema
- Gabriel (Auxiliar): Apoio operacional
- Natashia (Secretaria): Agendamentos e atendimento
- Dr. Francisco (Medico): Responsável técnico`;

            const knowledgeResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_store`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    version: 1,
                    content: knowledgeContent,
                    active: true
                })
            });

            let knowledgeId = null;
            if (knowledgeResponse.ok) {
                const knowledge = await knowledgeResponse.json();
                knowledgeId = knowledge[0]?.id;
                console.log('Knowledge base created');
            }

            console.log(JSON.stringify({
                requestId,
                action: 'seed_users',
                usersCreated: createdUsers.length,
                patientsCreated: createdPatients.length,
                errors: errors.length,
                knowledgeId,
                duration: Date.now() - startTime
            }));

            return new Response(JSON.stringify({
                data: {
                    message: 'Seed executado com sucesso',
                    usuarios_criados: createdUsers,
                    pacientes_criados: createdPatients,
                    base_conhecimento_id: knowledgeId,
                    erros: errors,
                    total_users: createdUsers.length,
                    total_patients: createdPatients.length
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'GET') {
            // Listar usuários criados
            const usersResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=*&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            const users = await usersResponse.json();

            return new Response(JSON.stringify({ data: users }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not allowed`);

    } catch (error) {
        console.error('Seed users function error:', error);

        const errorResponse = {
            error: {
                code: 'SEED_USERS_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

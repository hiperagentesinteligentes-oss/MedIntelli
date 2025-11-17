import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // GET: Buscar pacientes com filtros
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const search = url.searchParams.get('search');
      const ativo = url.searchParams.get('ativo');

      let query = supabaseClient
        .from('pacientes')
        .select('*');

      // Filtro de busca (nome, telefone, email)
      if (search && search.trim()) {
        query = query.or(
          `nome.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      // Filtro de status ativo
      if (ativo !== null && ativo !== undefined) {
        query = query.eq('ativo', ativo === 'true');
      }

      const { data, error } = await query.order('nome');

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Cadastrar novo paciente
    if (req.method === 'POST') {
      const paciente = await req.json();
      
      // Garantir que ativo = true
      paciente.ativo = true;

      // Validar convenio se fornecido
      if (paciente.convenio) {
        const conveniosPermitidos = ['UNIMED', 'UNIMED UNIFACIL', 'CASSI', 'CABESP'];
        if (!conveniosPermitidos.includes(paciente.convenio)) {
          return new Response(
            JSON.stringify({ error: 'Convenio invalido. Use: UNIMED, UNIMED UNIFACIL, CASSI ou CABESP' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data, error } = await supabaseClient
        .from('pacientes')
        .insert(paciente)
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT: Editar paciente
    if (req.method === 'PUT') {
      const { id, ...pacienteData } = await req.json();

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'ID do paciente e obrigatorio' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar convenio se fornecido
      if (pacienteData.convenio) {
        const conveniosPermitidos = ['UNIMED', 'UNIMED UNIFACIL', 'CASSI', 'CABESP'];
        if (!conveniosPermitidos.includes(pacienteData.convenio)) {
          return new Response(
            JSON.stringify({ error: 'Convenio invalido. Use: UNIMED, UNIMED UNIFACIL, CASSI ou CABESP' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data, error } = await supabaseClient
        .from('pacientes')
        .update(pacienteData)
        .eq('id', id)
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH: Ativar/Inativar paciente (soft delete)
    if (req.method === 'PATCH') {
      const { id, ativo } = await req.json();

      if (!id || ativo === undefined) {
        return new Response(
          JSON.stringify({ error: 'ID e status ativo sao obrigatorios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient
        .from('pacientes')
        .update({ ativo })
        .eq('id', id)
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Excluir paciente (hard delete)
    if (req.method === 'DELETE') {
      const { id } = await req.json();

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'ID do paciente e obrigatorio' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseClient
        .from('pacientes')
        .delete()
        .eq('id', id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Paciente excluido com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Metodo não suportado
    return new Response(
      JSON.stringify({ error: 'Metodo nao suportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

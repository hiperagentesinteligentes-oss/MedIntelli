import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PATCH, DELETE',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    if (method === "GET") {
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      
      let query = supabase
        .from("agendamentos")
        .select("id, inicio, fim, status, paciente_id, pacientes (nome)")
        .order("inicio", { ascending: true });

      // Se start e end forem fornecidos, aplicar filtro de data
      if (start && end) {
        query = query.gte("inicio", start).lt("fim", end);
      }

      const { data, error } = await query;

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === "POST") {
      const body = await req.json();
      const { paciente_id, inicio, fim } = body;
      if (!paciente_id || !inicio || !fim) throw new Error("Campos obrigatórios ausentes.");

      const { data, error } = await supabase
        .from("agendamentos")
        .insert(body)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === "PATCH") {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) throw new Error("ID obrigatório.");

      const { data, error } = await supabase
        .from("agendamentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) throw new Error("ID obrigatório.");

      const { data, error } = await supabase
        .from("agendamentos")
        .update({ status: "cancelado" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response("Método não suportado", { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

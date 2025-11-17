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
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("fila_espera")
        .select("id, paciente_id, status, pos, created_at, pacientes (id, nome, telefone)")
        .order("pos", { ascending: true })
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { paciente_id } = body;
      if (!paciente_id) throw new Error("Paciente obrigatório.");

      // Calcular próxima posição
      const { data: maxPos } = await supabase
        .from("fila_espera")
        .select("pos")
        .order("pos", { ascending: false })
        .limit(1);
      
      const proximaPosicao = (maxPos?.[0]?.pos ?? 0) + 1;

      const { data, error } = await supabase
        .from("fila_espera")
        .insert({ ...body, pos: proximaPosicao })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      
      // Reordenação em lote
      if (Array.isArray(body?.ordenacao)) {
        const updates = body.ordenacao.map((item: any) => 
          supabase.from("fila_espera").update({ pos: item.pos }).eq("id", item.id)
        );
        
        await Promise.all(updates);
        return new Response(JSON.stringify({ ok: true }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Atualização individual
      const { id, ...updates } = body;
      if (!id) throw new Error("ID obrigatório.");

      const { data, error } = await supabase
        .from("fila_espera")
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

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) throw new Error("ID obrigatório.");

      const { error } = await supabase
        .from("fila_espera")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response("Método não suportado", { status: 405, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

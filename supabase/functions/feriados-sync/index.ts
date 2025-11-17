import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "POST") {
      const path = url.pathname.toLowerCase();
      const body = await req.json().catch(() => ({}));

      if (path.endsWith("/sync")) {
        // body: [{data:'2025-01-01', titulo:'Confraternização', recorrente:true}, ...]
        for (const f of (Array.isArray(body) ? body : [])) {
          const d = new Date(f.data);
          const mes = d.getUTCMonth() + 1;
          const dia_mes = d.getUTCDate();
          const up = await supabase.from("feriados").upsert({
            data: f.data, titulo: f.titulo, recorrente: !!f.recorrente, mes, dia_mes, uf: f.uf ?? null, municipio: f.municipio ?? null
          }, { onConflict: "data" });
          if (up.error) throw up.error;
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }

      if (path.endsWith("/create")) {
        const d = new Date(body.data);
        const mes = d.getUTCMonth() + 1;
        const dia_mes = d.getUTCDate();
        const ins = await supabase.from("feriados").insert({
          data: body.data, titulo: body.titulo, recorrente: !!body.recorrente, mes, dia_mes, uf: body.uf ?? null, municipio: body.municipio ?? null
        });
        if (ins.error) throw ins.error;
        return new Response(JSON.stringify({ ok: true }), { status: 201, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: "Ação POST não reconhecida" }), { status: 400, headers: corsHeaders });
    }

    if (req.method === "PUT") {
      const b = await req.json().catch(() => ({}));
      const d = new Date(b.data);
      const mes = d.getUTCMonth() + 1;
      const dia_mes = d.getUTCDate();
      const up = await supabase.from("feriados")
        .update({ data: b.data, titulo: b.titulo, recorrente: !!b.recorrente, mes, dia_mes, uf: b.uf ?? null, municipio: b.municipio ?? null })
        .eq("id", b.id);
      if (up.error) throw up.error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ error: "id obrigatório" }), { status: 422, headers: corsHeaders });
      const del = await supabase.from("feriados").delete().eq("id", id);
      if (del.error) throw del.error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
    }

    // GET lista
    const { data, error } = await supabase.from("feriados").select("*").order("data", { ascending: true });
    if (error) throw error;
    return new Response(JSON.stringify({ data }), { status: 200, headers: corsHeaders });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: corsHeaders });
  }
});

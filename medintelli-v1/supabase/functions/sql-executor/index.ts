Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configurações do Supabase não encontradas');
    }

    const { action, queries } = await req.json();
    
    if (!action || !queries) {
      throw new Error('Ação e queries são obrigatórios');
    }

    let results = [];

    if (action === 'execute_sql') {
      for (const query of queries) {
        try {
          // Executar query no Supabase
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({ query })
          });

          const result = await response.json();
          results.push({ query, result, success: response.ok });
        } catch (error) {
          results.push({ query, error: error.message, success: false });
        }
      }
    }

    return new Response(JSON.stringify({ 
      data: results,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

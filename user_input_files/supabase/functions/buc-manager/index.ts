Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (req.method === 'GET') {
      // Listar versões ou obter versão específica
      const url = new URL(req.url);
      const versionParam = url.searchParams.get('version');
      const latest = url.searchParams.get('latest');

      let queryUrl = `${supabaseUrl}/rest/v1/buc_versoes?select=*&order=version.desc`;
      
      if (versionParam) {
        queryUrl = `${supabaseUrl}/rest/v1/buc_versoes?version=eq.${versionParam}&select=*`;
      } else if (latest === 'true') {
        queryUrl += '&limit=1';
      }

      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar versões da BUC');
      }

      const data = await response.json();

      return new Response(JSON.stringify({ 
        success: true, 
        data: latest === 'true' && data.length > 0 ? data[0] : data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (req.method === 'POST') {
      // Criar nova versão
      const { content, action } = await req.json();

      if (!content || content.trim().length === 0) {
        throw new Error('Conteúdo não pode estar vazio');
      }

      if (content.length > 50000) {
        throw new Error('Conteúdo excede o limite de 50.000 caracteres');
      }

      // Obter versão mais recente
      const latestResponse = await fetch(
        `${supabaseUrl}/rest/v1/buc_versoes?select=version&order=version.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );

      const latestData = await latestResponse.json();
      const nextVersion = latestData.length > 0 ? latestData[0].version + 1 : 1;

      // Obter userId do token
      const authHeader = req.headers.get('authorization');
      let userId = null;
      
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const payload = token.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          userId = decoded.sub;
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }

      // Inserir nova versão
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/buc_versoes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          content,
          version: nextVersion,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        throw new Error(`Erro ao criar nova versão: ${errorText}`);
      }

      const newVersion = await insertResponse.json();

      return new Response(JSON.stringify({
        success: true,
        message: 'Nova versão criada com sucesso',
        data: newVersion[0],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Método não permitido' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });

  } catch (error) {
    console.error('BUC Manager error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao processar requisição',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

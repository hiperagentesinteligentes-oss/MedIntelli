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
    // Extract parameters from request body
    const requestData = await req.json();
    const { question, patientId } = requestData;

    if (!question) {
      throw new Error('Question is required');
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // First, try to get knowledge base content from database
    let knowledgeBaseContent = 'Sistema MedIntelli - Base de Conhecimento Padrão. Em caso de dúvidas sobre o sistema, consulte a documentação ou entre em contato com o suporte.';
    
    try {
      // Query knowledge base table
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const kbResponse = await fetch(`${supabaseUrl}/rest/v1/base_conhecimento?select=*&limit=1`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        });

        if (kbResponse.ok) {
          const kbData = await kbResponse.json();
          if (kbData && kbData.length > 0) {
            knowledgeBaseContent = kbData[0].conteudo || kbData[0].conteudo_base || knowledgeBaseContent;
          }
        }
      }
    } catch (kbError) {
      console.log('Knowledge base not found, using default content:', kbError.message);
    }

    // Prepare the prompt for OpenAI
    const prompt = `Base de Conhecimento MedIntelli:
${knowledgeBaseContent}

Paciente pergunta: ${question}

Por favor, responda de forma clara, útil e em linguagem acessível. Se a pergunta não estiver relacionada à base de conhecimento, direcione para contactar o atendimento médico.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de saúde do sistema MedIntelli. Responda apenas baseado na base de conhecimento fornecida. Para questões médicas, sempre recomende consulta com profissional de saúde.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content || 'Desculpe, não foi possível processar sua pergunta no momento.';

    // Log the interaction for learning (optional)
    if (patientId) {
      // Could store this interaction in database for learning purposes
    }

    // Return success response
    return new Response(JSON.stringify({ 
      data: { 
        question,
        answer: aiResponse,
        timestamp: new Date().toISOString(),
        knowledgeSource: 'MedIntelli Base de Conhecimento'
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Base conhecimento error:', error);
    
    // Return error response with fallback
    const errorResponse = {
      error: {
        code: 'BASE_CONHECIMENTO_ERROR',
        message: error.message
      },
      data: {
        answer: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente mais tarde ou entre em contato com o atendimento.',
        fallback: true
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

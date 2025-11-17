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
    const { action, ...params } = requestData;

    let result;

    switch (action) {
      case 'list':
        // List messages from database
        result = await listMessages(params);
        break;
      case 'send':
        // Send message to patient app
        result = await sendMessage(params);
        break;
      case 'mark-read':
        // Mark message as read
        result = await markAsRead(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Return success response
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mensagens app error:', error);
    
    // Return error response
    const errorResponse = {
      error: {
        code: 'MENSAGENS_APP_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function listMessages(params: any) {
  const { limit = 50, offset = 0 } = params;
  
  // This would query the mensagens_app table
  // For now, return mock data structure
  return {
    messages: [],
    total: 0,
    limit,
    offset
  };
}

async function sendMessage(params: any) {
  const { patientId, message, type = 'text' } = params;
  
  if (!patientId || !message) {
    throw new Error('patientId and message are required');
  }

  // This would insert into mensagens_app table
  return {
    success: true,
    messageId: 'mock-id',
    sentAt: new Date().toISOString()
  };
}

async function markAsRead(params: any) {
  const { messageId } = params;
  
  if (!messageId) {
    throw new Error('messageId is required');
  }

  // This would update the message as read in database
  return {
    success: true,
    messageId,
    markedAt: new Date().toISOString()
  };
}

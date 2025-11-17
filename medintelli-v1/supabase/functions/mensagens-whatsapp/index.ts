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
        // List WhatsApp messages from database
        result = await listWhatsAppMessages(params);
        break;
      case 'send':
        // Send message via WhatsApp
        result = await sendWhatsAppMessage(params);
        break;
      case 'mark-read':
        // Mark message as read
        result = await markWhatsAppAsRead(params);
        break;
      case 'conversation':
        // Get conversation thread
        result = await getConversation(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Return success response
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mensagens WhatsApp error:', error);
    
    // Return error response
    const errorResponse = {
      error: {
        code: 'MENSAGENS_WHATSAPP_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function listWhatsAppMessages(params: any) {
  const { limit = 50, offset = 0, phone } = params;
  
  // This would query the mensagens_whatsapp table
  // For now, return mock data structure
  return {
    messages: [],
    total: 0,
    limit,
    offset
  };
}

async function sendWhatsAppMessage(params: any) {
  const { phone, message, type = 'text', template = null } = params;
  
  if (!phone || !message) {
    throw new Error('phone and message are required');
  }

  // This would use the whatsapp-send-message function
  // For now, return mock response
  return {
    success: true,
    messageId: 'mock-whatsapp-id',
    sentAt: new Date().toISOString()
  };
}

async function markWhatsAppAsRead(params: any) {
  const { messageId } = params;
  
  if (!messageId) {
    throw new Error('messageId is required');
  }

  // This would update the WhatsApp message as read in database
  return {
    success: true,
    messageId,
    markedAt: new Date().toISOString()
  };
}

async function getConversation(params: any) {
  const { phone, limit = 20 } = params;
  
  if (!phone) {
    throw new Error('phone is required');
  }

  // This would get conversation thread from mensagens_whatsapp table
  return {
    conversation: [],
    hasMore: false,
    lastMessage: null
  };
}

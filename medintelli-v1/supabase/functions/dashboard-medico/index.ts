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
      case 'dashboard':
        // Get dashboard metrics for doctor
        result = await getDashboardMetrics(params);
        break;
      case 'appointments-today':
        // Get today's appointments
        result = await getTodayAppointments(params);
        break;
      case 'alerts':
        // Get pending alerts
        result = await getAlerts(params);
        break;
      case 'messages-unread':
        // Get unread messages
        result = await getUnreadMessages(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Return success response
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard médico error:', error);
    
    // Return error response
    const errorResponse = {
      error: {
        code: 'DASHBOARD_MEDICO_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getDashboardMetrics(params: any) {
  const { doctorId } = params;
  
  if (!doctorId) {
    throw new Error('doctorId is required');
  }

  // This would query various tables to get metrics
  // For now, return mock dashboard data
  return {
    appointmentsToday: 8,
    pendingExams: 3,
    unreadMessages: 5,
    urgentAlerts: 2,
    waitingPatients: 4,
    completedToday: 6,
    totalPatients: 156,
    averageWaitTime: 25 // minutes
  };
}

async function getTodayAppointments(params: any) {
  const { doctorId } = params;
  
  if (!doctorId) {
    throw new Error('doctorId is required');
  }

  // This would query agendamentos table for today
  // For now, return mock appointments
  return {
    appointments: [],
    total: 0
  };
}

async function getAlerts(params: any) {
  const { doctorId, status = 'pending' } = params;
  
  if (!doctorId) {
    throw new Error('doctorId is required');
  }

  // This would query alertas_sistema table
  return {
    alerts: [],
    urgent: 0,
    total: 0
  };
}

async function getUnreadMessages(params: any) {
  const { doctorId } = params;
  
  if (!doctorId) {
    throw new Error('doctorId is required');
  }

  // This would query mensagens_app and mensagens_whatsapp tables
  return {
    appMessages: 0,
    whatsappMessages: 0,
    total: 0
  };
}

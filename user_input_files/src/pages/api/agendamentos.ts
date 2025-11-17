// Proxy API para Edge Function agendamentos (Patch v4.1)
// Implementa proxy para CRUD de agendamentos com Service Role Key
// DELETE bloqueado conforme especificação

import type { NextApiRequest, NextApiResponse } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/agendamentos`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Habilita CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Service Role Key não configurada');
    return res.status(500).json({ 
      error: 'Configuração do servidor incompleta',
      details: 'Service Role Key não encontrada'
    });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log de requisição recebida
    console.log(JSON.stringify({
      requestId,
      action: 'proxy_request_received',
      method: req.method,
      url: req.url,
      query: req.query,
      timestamp: new Date().toISOString(),
      function: 'agendamentos_proxy_v4_1'
    }));

    // Preparar headers para a Edge Function
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    };

    // Forward de headers adicionais se existirem
    if (req.headers['x-client-info']) {
      headers['x-client-info'] = req.headers['x-client-info'] as string;
    }

    let response;
    const { method } = req;

    switch (method) {
      case 'GET': {
        // GET: Proxy para GET da Edge Function com suporte a query parameters
        const { scope, start, end } = req.query;
        
        // Construir URL com query parameters
        const queryParams = new URLSearchParams();
        if (scope) queryParams.append('scope', scope as string);
        if (start) queryParams.append('start', start as string);
        if (end) queryParams.append('end', end as string);
        
        const url = queryParams.toString() 
          ? `${EDGE_FUNCTION_URL}?${queryParams.toString()}`
          : EDGE_FUNCTION_URL;

        // Log da requisição GET
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_get_request',
          scope,
          start,
          end,
          url,
          timestamp: new Date().toISOString()
        }));

        response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const data = await response.json();
        
        // Log da resposta GET
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_get_response',
          status: response.status,
          duration: Date.now() - startTime,
          data: data,
          timestamp: new Date().toISOString()
        }));

        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
      }

      case 'POST': {
        // POST: Proxy para POST da Edge Function
        const body = JSON.stringify(req.body);
        
        // Log da requisição POST
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_post_request',
          body: req.body,
          timestamp: new Date().toISOString()
        }));

        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers,
          body,
        });

        const data = await response.json();
        
        // Log da resposta POST
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_post_response',
          status: response.status,
          duration: Date.now() - startTime,
          data: data,
          timestamp: new Date().toISOString()
        }));
        
        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        return res.status(201).json(data);
      }

      case 'PUT': {
        // PUT: Proxy para PUT da Edge Function
        const body = JSON.stringify(req.body);
        
        // Log da requisição PUT
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_put_request',
          body: req.body,
          timestamp: new Date().toISOString()
        }));

        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'PUT',
          headers,
          body,
        });

        const data = await response.json();
        
        // Log da resposta PUT
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_put_response',
          status: response.status,
          duration: Date.now() - startTime,
          data: data,
          timestamp: new Date().toISOString()
        }));
        
        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
      }

      case 'PATCH': {
        // PATCH: Proxy para PATCH da Edge Function
        const body = JSON.stringify(req.body);
        
        // Log da requisição PATCH
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_patch_request',
          body: req.body,
          timestamp: new Date().toISOString()
        }));

        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'PATCH',
          headers,
          body,
        });

        const data = await response.json();
        
        // Log da resposta PATCH
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_patch_response',
          status: response.status,
          duration: Date.now() - startTime,
          data: data,
          timestamp: new Date().toISOString()
        }));
        
        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
      }

      case 'DELETE': {
        // DELETE: DEVE SER BLOQUEADO conforme especificação
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_delete_blocked',
          timestamp: new Date().toISOString()
        }));

        return res.status(405).json({ 
          error: 'Método DELETE não permitido',
          code: 'METHOD_NOT_ALLOWED',
          message: 'Operação DELETE está bloqueada para agendamentos. Use PUT para alterar status ou PATCH para outras operações.'
        });
      }

      default:
        console.log(JSON.stringify({
          requestId,
          action: 'proxy_method_not_allowed',
          method: method,
          timestamp: new Date().toISOString()
        }));
        
        return res.status(405).json({ 
          error: `Método ${method} não permitido`,
          code: 'METHOD_NOT_ALLOWED',
          allowed_methods: ['GET', 'POST', 'PUT', 'PATCH'],
          message: 'Métodos permitidos: GET, POST, PUT, PATCH'
        });
    }
  } catch (error) {
    // Log de erro
    console.error(JSON.stringify({
      requestId,
      action: 'proxy_error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }));

    // Log específico para erro de rede
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(JSON.stringify({
        requestId,
        action: 'proxy_network_error',
        error: 'Falha de comunicação com Edge Function',
        details: error.message,
        timestamp: new Date().toISOString()
      }));
    }

    return res.status(500).json({ 
      error: 'Erro interno do servidor proxy',
      code: 'PROXY_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      requestId
    });
  }
}
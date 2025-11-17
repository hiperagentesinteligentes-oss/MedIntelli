// Proxy API para Edge Function fila-espera (API 4.2)
// Implementa GET, POST (com paciente_novo), PUT, PATCH com Service Role Key
// DELETE bloqueado (405 Method Not Allowed)
// Suporte a ordenação JSONB e logging completo

import type { NextApiRequest, NextApiResponse } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fila-espera`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log da requisição
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(JSON.stringify({
    requestId,
    type: 'API_PROXY_REQUEST',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    }
  }));

  // Validação do Service Role Key
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error(JSON.stringify({
      requestId,
      type: 'API_PROXY_ERROR',
      error: 'SUPABASE_SERVICE_ROLE_KEY não configurado'
    }));
    return res.status(500).json({ 
      error: 'Configuração do servidor incompleta',
      code: 'SERVICE_ROLE_KEY_MISSING'
    });
  }

  try {
    // DELETE bloqueado - retornar 405 Method Not Allowed
    if (req.method === 'DELETE') {
      console.log(JSON.stringify({
        requestId,
        type: 'API_PROXY_BLOCKED',
        method: 'DELETE',
        reason: 'DELETE method not allowed for fila-espera'
      }));
      
      return res.status(405).json({ 
        error: 'Método DELETE não permitido',
        code: 'METHOD_NOT_ALLOWED',
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH']
      });
    }

    // Preparar headers para a Edge Function
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    };

    // Forward de headers relevantes
    if (req.headers.authorization) {
      headers['Authorization'] = `Bearer ${req.headers.authorization.replace('Bearer ', '')}`;
    }
    if (req.headers['x-client-info']) {
      headers['x-client-info'] = req.headers['x-client-info'] as string;
    }

    let response;
    const { method } = req;

    switch (method) {
      case 'GET': {
        // GET: Proxy para Edge Function com suporte a ordenação JSONB
        const { status, modo, ordenar, limite, offset, ordenacao } = req.query;
        
        // Construir URL com query parameters
        const queryParams = new URLSearchParams();
        if (status) queryParams.append('status', status as string);
        if (modo) queryParams.append('modo', modo as string);
        if (ordenar) queryParams.append('ordenar', ordenar as string);
        if (limite) queryParams.append('limite', limite as string);
        if (offset) queryParams.append('offset', offset as string);
        if (ordenacao) queryParams.append('ordenacao', ordenacao as string);
        
        const url = queryParams.toString() 
          ? `${EDGE_FUNCTION_URL}?${queryParams.toString()}`
          : EDGE_FUNCTION_URL;

        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_FORWARD',
          method: 'GET',
          edgeUrl: url,
          query: Object.fromEntries(queryParams)
        }));

        response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_RESPONSE',
          method: 'GET',
          status: response.status,
          duration,
          dataSize: JSON.stringify(data).length
        }));
        
        if (!response.ok) {
          return res.status(response.status).json({
            ...data,
            requestId,
            proxyInfo: 'fila-espera API 4.2'
          });
        }

        return res.status(200).json({
          ...data,
          requestId,
          proxyInfo: 'fila-espera API 4.2'
        });
      }

      case 'POST': {
        // POST: Proxy para Edge Function com campo paciente_novo
        const body = JSON.stringify(req.body);
        
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_FORWARD',
          method: 'POST',
          edgeUrl: EDGE_FUNCTION_URL,
          hasPacienteNovo: !!req.body.paciente_novo,
          bodyKeys: Object.keys(req.body)
        }));
        
        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers,
          body,
        });

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_RESPONSE',
          method: 'POST',
          status: response.status,
          duration,
          dataSize: JSON.stringify(data).length
        }));
        
        if (!response.ok) {
          return res.status(response.status).json({
            ...data,
            requestId,
            proxyInfo: 'fila-espera API 4.2'
          });
        }

        return res.status(201).json({
          ...data,
          requestId,
          proxyInfo: 'fila-espera API 4.2'
        });
      }

      case 'PUT': {
        // PUT: Proxy para Edge Function
        const body = JSON.stringify(req.body);
        
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_FORWARD',
          method: 'PUT',
          edgeUrl: EDGE_FUNCTION_URL,
          bodyKeys: Object.keys(req.body)
        }));
        
        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'PUT',
          headers,
          body,
        });

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_RESPONSE',
          method: 'PUT',
          status: response.status,
          duration,
          dataSize: JSON.stringify(data).length
        }));
        
        if (!response.ok) {
          return res.status(response.status).json({
            ...data,
            requestId,
            proxyInfo: 'fila-espera API 4.2'
          });
        }

        return res.status(200).json({
          ...data,
          requestId,
          proxyInfo: 'fila-espera API 4.2'
        });
      }

      case 'PATCH': {
        // PATCH: Proxy para Edge Function com suporte a ordenação JSONB
        const body = JSON.stringify(req.body);
        
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_FORWARD',
          method: 'PATCH',
          edgeUrl: EDGE_FUNCTION_URL,
          hasOrdenacao: !!req.body.ordenacao,
          bodyKeys: Object.keys(req.body)
        }));
        
        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'PATCH',
          headers,
          body,
        });

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          type: 'API_PROXY_RESPONSE',
          method: 'PATCH',
          status: response.status,
          duration,
          dataSize: JSON.stringify(data).length
        }));
        
        if (!response.ok) {
          return res.status(response.status).json({
            ...data,
            requestId,
            proxyInfo: 'fila-espera API 4.2'
          });
        }

        return res.status(200).json({
          ...data,
          requestId,
          proxyInfo: 'fila-espera API 4.2'
        });
      }

      default:
        return res.status(405).json({ 
          error: `Método ${method} não permitido`,
          code: 'METHOD_NOT_ALLOWED',
          allowedMethods: ['GET', 'POST', 'PUT', 'PATCH'],
          requestId
        });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log do erro
    console.error(JSON.stringify({
      requestId,
      type: 'API_PROXY_ERROR',
      method: req.method,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      duration
    }));
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      requestId,
      proxyInfo: 'fila-espera API 4.2'
    });
  }
}

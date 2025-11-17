// API Proxy 4.3 - Feriados (Patch v4)
// Proxy para Edge Function feriados-sync com Service Role Key
// Implementa operações CRUD completas com autenticação service role

import type { NextApiRequest, NextApiResponse } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/feriados-sync`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers completos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Gerar ID de requisição para log
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log da requisição
    console.log(JSON.stringify({
      requestId,
      method: req.method,
      url: req.url,
      query: req.query,
      timestamp: new Date().toISOString(),
      source: 'api-proxy-v4.3'
    }));

    // Validação de configuração
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
    }

    // Preparar headers para Edge Function com Service Role Key
    const edgeHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
    };

    // Forward de headers do cliente (exceto os que já definimos)
    const forwardedHeaders = ['user-agent', 'x-forwarded-for', 'x-real-ip', 'x-client-info'];
    for (const header of forwardedHeaders) {
      const value = req.headers[header];
      if (value) {
        edgeHeaders[header] = value.toString();
      }
    }

    let response;
    const { method } = req;
    let responseData: any;
    let statusCode: number;

    switch (method) {
      case 'GET': {
        // GET: Proxy para GET da Edge Function com filtros
        const queryParams = new URLSearchParams();
        
        // Adicionar filtros da query da API
        if (req.query.ano) queryParams.append('ano', req.query.ano.toString());
        if (req.query.tipo) queryParams.append('tipo', req.query.tipo.toString());
        if (req.query.recorrente !== undefined) {
          queryParams.append('recorrente', req.query.recorrente.toString());
        }

        const edgeUrl = queryParams.toString() 
          ? `${EDGE_FUNCTION_URL}?${queryParams.toString()}`
          : EDGE_FUNCTION_URL;

        console.log(JSON.stringify({
          requestId,
          action: 'proxy-get',
          edgeUrl: edgeUrl.replace(SUPABASE_SERVICE_ROLE_KEY, 'HIDDEN'),
          duration: Date.now() - startTime
        }));

        response = await fetch(edgeUrl, {
          method: 'GET',
          headers: edgeHeaders,
        });

        responseData = await response.json();
        statusCode = response.status;

        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          action: 'proxy-get-response',
          status: response.status,
          hasData: !!responseData?.data,
          duration: Date.now() - startTime
        }));

        return res.status(statusCode).json(responseData);
      }

      case 'POST': {
        // POST: Proxy para POST da Edge Function (operação sync)
        const body = req.body;
        
        console.log(JSON.stringify({
          requestId,
          action: 'proxy-post',
          hasBody: !!body,
          bodyKeys: body ? Object.keys(body) : [],
          duration: Date.now() - startTime
        }));

        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: edgeHeaders,
          body: JSON.stringify(body),
        });

        responseData = await response.json();
        statusCode = response.status;

        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          action: 'proxy-post-response',
          status: response.status,
          hasData: !!responseData?.data,
          duration: Date.now() - startTime
        }));

        return res.status(statusCode).json(responseData);
      }

      case 'PUT': {
        // PUT: Proxy para PUT da Edge Function (edição com recorrência)
        const body = req.body;
        
        // Validar se body tem os campos necessários
        if (!body || !body.id) {
          return res.status(400).json({
            error: 'ID é obrigatório no body para PUT',
            requestId
          });
        }

        console.log(JSON.stringify({
          requestId,
          action: 'proxy-put',
          hasBody: !!body,
          bodyKeys: body ? Object.keys(body) : [],
          bodyFields: ['id', 'data', 'titulo', 'recorrente', 'escopo', 'uf', 'municipio', 'dia_mes', 'mes'],
          duration: Date.now() - startTime
        }));

        response = await fetch(EDGE_FUNCTION_URL, {
          method: 'PUT',
          headers: edgeHeaders,
          body: JSON.stringify(body),
        });

        responseData = await response.json();
        statusCode = response.status;

        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          action: 'proxy-put-response',
          status: response.status,
          hasData: !!responseData?.data,
          duration: Date.now() - startTime
        }));

        return res.status(statusCode).json(responseData);
      }

      case 'DELETE': {
        // DELETE: Proxy para DELETE da Edge Function COM ID em query param
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({
            error: 'ID é obrigatório em query param para DELETE',
            requestId
          });
        }

        console.log(JSON.stringify({
          requestId,
          action: 'proxy-delete',
          id: id.toString(),
          duration: Date.now() - startTime
        }));

        const edgeUrl = `${EDGE_FUNCTION_URL}?id=${encodeURIComponent(id.toString())}`;

        response = await fetch(edgeUrl, {
          method: 'DELETE',
          headers: edgeHeaders,
        });

        responseData = await response.json();
        statusCode = response.status;

        // Log da resposta
        console.log(JSON.stringify({
          requestId,
          action: 'proxy-delete-response',
          status: response.status,
          hasData: !!responseData?.data,
          duration: Date.now() - startTime
        }));

        return res.status(statusCode).json(responseData);
      }

      default: {
        return res.status(405).json({
          error: `Método ${method} não permitido`,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          requestId
        });
      }
    }

  } catch (error) {
    // Log do erro
    console.error(JSON.stringify({
      requestId,
      action: 'proxy-error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }));

    // Determinar status code baseado no tipo de erro
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';

    if (errorMessage.includes('não configurada') || 
        errorMessage.includes('Service Role Key')) {
      statusCode = 500;
    } else if (errorMessage.includes('obrigatório') || 
               errorMessage.includes('ID é obrigatório')) {
      statusCode = 400;
    } else if (errorMessage.includes('Token inválido') || 
               errorMessage.includes('autorização')) {
      statusCode = 401;
    }

    return res.status(statusCode).json({
      error: {
        code: 'PROXY_FERIADOS_ERROR',
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    // Log final da operação
    console.log(JSON.stringify({
      requestId,
      action: 'proxy-complete',
      method: req.method,
      duration: Date.now() - startTime
    }));
  }
}
# API Proxy 4.3 - Feriados

## Resumo da Implementação

Esta documentação descreve a implementação da **API Proxy 4.3** para o endpoint de feriados, que implementa operações CRUD completas através de proxy para a Edge Function `feriados-sync`.

## Arquivos

- **API**: `/src/pages/api/feriados.ts` (Patch v4.3)
- **Edge Function**: `/supabase/functions/feriados-sync/index.ts`
- **Documentação**: `/docs/patch_v4_api_4_3_feriados.md`

## Características Principais

### ✅ Operações CRUD Completas

Diferentemente de outros endpoints, este permite todas as operações CRUD:
- **GET**: Listar feriados com filtros
- **POST**: Operação de sincronização
- **PUT**: Edição com suporte a recorrência
- **DELETE**: Remoção com ID em query param

### ✅ Autenticação Service Role

- Usa **Service Role Key** para autenticação (não anon key)
- Fornece permissões administrativas completas
- Edge Function executa com privilégios elevados

### ✅ Log Completo

- Gera **requestId único** para cada requisição
- Log de requisições e respostas
- Log de erros com stack trace
- Métricas de duração de operação

### ✅ CORS e Headers

- Headers CORS completos configurados
- Forward de headers do cliente
- Suporte a preflight OPTIONS

### ✅ Suporte a Recorrência

- Campos: `recorrente`, `mes`, `dia_mes`
- Validação de dados de recorrência
- Sincronização automática de feriados nacionais

## Endpoints

### GET `/api/feriados`

Lista feriados com filtros opcionais.

**Parâmetros de Query:**
- `ano` (opcional): Filtrar por ano
- `tipo` (opcional): `'nacional'` ou `'municipal'`
- `recorrente` (opcional): `'true'` ou `'false'`

**Exemplo:**
```bash
GET /api/feriados?ano=2024&tipo=nacional&recorrente=true
```

**Resposta:**
```json
{
  "data": [
    {
      "id": 1,
      "data": "2024-01-01",
      "titulo": "Confraternização Universal",
      "escopo": "nacional",
      "recorrente": true,
      "dia_mes": 1,
      "mes": 1
    }
  ]
}
```

### POST `/api/feriados`

Executa operação de sincronização de feriados.

**Body:**
```json
{
  "action": "sync",
  "feriados": [
    {
      "dia": 1,
      "mes": 1,
      "titulo": "Confraternização Universal",
      "escopo": "nacional"
    }
  ]
}
```

**Resposta:**
```json
{
  "data": {
    "message": "Sincronização de feriados concluída",
    "results": {
      "created": 8,
      "updated": 0,
      "errors": 0,
      "totalProcessed": 8
    },
    "year": 2024
  }
}
```

### PUT `/api/feriados`

Edita um feriado específico com suporte a recorrência.

**Body:**
```json
{
  "id": 1,
  "data": "2024-01-01",
  "titulo": "Confraternização Universal - Atualizado",
  "recorrente": true,
  "escopo": "nacional",
  "dia_mes": 1,
  "mes": 1
}
```

**Resposta:**
```json
{
  "data": {
    "message": "Feriado atualizado com sucesso",
    "id": 1,
    "titulo": "Confraternização Universal - Atualizado"
  }
}
```

### DELETE `/api/feriados`

Remove um feriado específico.

**Parâmetros de Query:**
- `id` (obrigatório): ID do feriado a ser removido

**Exemplo:**
```bash
DELETE /api/feriados?id=1
```

**Resposta:**
```json
{
  "data": {
    "message": "Feriado excluído com sucesso",
    "id": 1,
    "titulo": "Confraternização Universal"
  }
}
```

## Configuração de Ambiente

**Variáveis Necessárias:**
```bash
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

## Validações Implementadas

### PUT (Edição)
- ✅ ID obrigatório
- ✅ Título obrigatório (não vazio)
- ✅ Escopo válido: `'nacional'` ou `'municipal'`
- ✅ Data no formato YYYY-MM-DD (se fornecida)
- ✅ Dia do mês: 1-31 (se recorrente)
- ✅ Mês: 1-12 (se recorrente)
- ✅ Prevenção de conflitos de data

### DELETE (Exclusão)
- ✅ ID obrigatório em query param
- ✅ Verificação de existência
- ✅ Verificação de agendamentos associados
- ✅ Impede exclusão se há agendamentos ativos

## Logs Estruturados

**Exemplo de Log de Requisição:**
```json
{
  "requestId": "uuid-here",
  "method": "PUT",
  "url": "/api/feriados",
  "query": { "id": "1" },
  "timestamp": "2024-11-11T09:51:29.000Z",
  "source": "api-proxy-v4.3"
}
```

**Exemplo de Log de Resposta:**
```json
{
  "requestId": "uuid-here",
  "action": "proxy-put-response",
  "status": 200,
  "hasData": true,
  "duration": 125
}
```

**Exemplo de Log de Erro:**
```json
{
  "requestId": "uuid-here",
  "action": "proxy-error",
  "error": "ID é obrigatório no body para PUT",
  "stack": "Error: ID é obrigatório no body para PUT...",
  "duration": 25
}
```

## Códigos de Status HTTP

- `200`: Operação bem-sucedida
- `201`: Recurso criado (POST)
- `400`: Requisição inválida (parâmetros obrigatórios, validação)
- `401`: Não autorizado (autenticação)
- `404`: Recurso não encontrado
- `405`: Método não permitido
- `409`: Conflito (data duplicada, etc.)
- `500`: Erro interno do servidor

## Diferenças do Patch Anterior (v3)

### v3 (Anterior)
- Autenticação com **Anon Key**
- Log básico
- Parcialmente proxy para Edge Function
- Algumas operações vão direto ao Supabase REST API

### v4.3 (Atual)
- Autenticação com **Service Role Key**
- **Log completo** com requestId
- **100% proxy** para Edge Function
- **Operações CRUD completas**
- **Suporte completo a recorrência**
- **Validações mais robustas**

## Exemplos de Uso

### Listar todos os feriados de 2024
```bash
curl -X GET "https://sua-api.com/api/feriados?ano=2024" \
  -H "Content-Type: application/json"
```

### Sincronizar feriados nacionais
```bash
curl -X POST "https://sua-api.com/api/feriados" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync"
  }'
```

### Editar feriado
```bash
curl -X PUT "https://sua-api.com/api/feriados" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "titulo": "Novo Nome do Feriado",
    "recorrente": true
  }'
```

### Excluir feriado
```bash
curl -X DELETE "https://sua-api.com/api/feriados?id=1" \
  -H "Content-Type: application/json"
```

## Monitoramento

**Métricas Disponíveis:**
- Número de requisições por método
- Tempo de resposta médio
- Taxa de erro por código de status
- Duração de operações da Edge Function
- Contagem de sínteses concluídas

**Alertas Sugeridos:**
- Taxa de erro > 5%
- Tempo de resposta > 2s
- Falhas de autenticação
- Exclusões com agendamentos associados

## Conclusão

A API Proxy 4.3 para feriados implementa uma solução completa e robusta para gestão de feriados no sistema, com:

- ✅ **Autenticação segura** com Service Role Key
- ✅ **Operações CRUD completas**
- ✅ **Log detalhado** para monitoramento
- ✅ **Validações robustas**
- ✅ **Suporte a recorrência**
- ✅ **Integração completa** com Edge Function

Esta implementação garante integridade dos dados e funcionalidade completa para gestão de feriados no sistema Medintelli.
# Patch v4 - API 4.2: Proxy fila-espera

## Visão Geral
API Proxy 4.2 para gerenciar operações da fila de espera através da Edge Function `fila-espera`, implementando autenticação Service Role e logging completo.

## Arquivo Implementado
- **Caminho**: `/src/pages/api/fila-espera.ts`
- **Versão**: 4.2
- **Data**: 2025-11-11

## Características Principais

### Autenticação
- **Método**: Service Role Key do Supabase
- **Headers**: 
  - `Authorization: Bearer {SERVICE_ROLE_KEY}`
  - `apikey: {SERVICE_ROLE_KEY}`
  - Forward do header de autorização do cliente quando presente

### Métodos HTTP Suportados

#### ✅ GET - Listar fila de espera
```typescript
GET /api/fila-espera
```

**Parâmetros de Query:**
- `status` (opcional): Status dos itens (padrão: 'aguardando')
- `modo` (opcional): Modo de operação
- `ordenar` (opcional): Campo de ordenação (padrão: 'pos.asc')
- `limite` (opcional): Limite de resultados (padrão: '50')
- `offset` (opcional): Offset para paginação (padrão: '0')
- `ordenacao` (opcional): Ordenação JSONB personalizada

**Exemplo de resposta:**
```json
{
  "ok": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  },
  "requestId": "req_1731312289_abc123def",
  "proxyInfo": "fila-espera API 4.2"
}
```

#### ✅ POST - Adicionar paciente (com paciente_novo)
```typescript
POST /api/fila-espera
```

**Body:**
```json
{
  "paciente_id": "uuid-paciente", // OU
  "paciente_novo": {
    "nome": "João Silva",
    "telefone": "(11) 99999-9999",
    "convenio": "PARTICULAR",
    "observacoes": "Observações opcionais"
  },
  "motivo": "Consulta de rotina",
  "prioridade": "normal",
  "observacoes": "Observações do atendimento"
}
```

**Campos principais:**
- `paciente_id` OU `paciente_novo` (obrigatório um)
- `motivo` (opcional): Motivo do atendimento
- `prioridade` (opcional): normal, alta, urgente (padrão: normal)
- `observacoes` (opcional): Observações

**Funcionalidade paciente_novo:**
- Cadastro automático de pacientes
- Validação de duplicatas (nome + telefone)
- Cálculo automático da posição na fila

#### ✅ PUT - Atualização completa
```typescript
PUT /api/fila-espera
```

**Body:**
```json
{
  "id": "uuid-item",
  "paciente_id": "uuid-paciente",
  "nome": "João Silva",        // Atualiza dados do paciente
  "telefone": "(11) 99999-9999",
  "motivo": "Motivo atualizado",
  "prioridade": "alta",
  "status": "aguardando",
  "observacoes": "Observações atualizadas"
}
```

**Funcionalidades:**
- Atualização de dados do item na fila
- Atualização de dados do paciente (nome, telefone)
- Cálculo automático do score de prioridade

#### ✅ PATCH - Atualização parcial / Reordenação
```typescript
PATCH /api/fila-espera
```

**1. Atualização parcial individual:**
```json
{
  "id": "uuid-item",
  "nova_posicao": 5,
  "observacoes": "Observações",
  "prioridade": "alta",
  "status": "aguardando"
}
```

**2. Reordenação em lote com ordenação JSONB:**
```json
{
  "ordenacao": [
    {
      "id": "uuid-1",
      "pos": 1,
      "prioridade_calculada": 100,
      "score_urgencia": 0.85
    },
    {
      "id": "uuid-2", 
      "pos": 2,
      "prioridade_calculada": 75,
      "score_urgencia": 0.65
    }
  ]
}
```

**Suporte a JSONB:**
- Campos extras salvos na coluna `ordenacao` (JSONB)
- Permite ordenação personalizada e metadados

#### ❌ DELETE - BLOQUEADO
```typescript
DELETE /api/fila-espera
```

**Resposta:**
```json
{
  "error": "Método DELETE não permitido",
  "code": "METHOD_NOT_ALLOWED",
  "allowedMethods": ["GET", "POST", "PUT", "PATCH"],
  "requestId": "req_1731312289_abc123def"
}
```

**Status HTTP:** 405 Method Not Allowed

## CORS
- **Access-Control-Allow-Origin**: `*`
- **Access-Control-Allow-Methods**: `GET, POST, PUT, PATCH, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, Authorization, x-client-info, apikey`
- **Access-Control-Max-Age**: `86400`

## Logging

### Request ID
Todas as requisições recebem um `requestId` único para rastreamento:
```
req_{timestamp}_{random}
```

### Logs Implementados
1. **Request log**: Método, URL, query parameters, headers (com redção de authorization)
2. **Forward log**: Detalhes do encaminhamento para Edge Function
3. **Response log**: Status, duração, tamanho da resposta
4. **Error log**: Erros com stack trace completo

### Exemplo de Log
```json
{
  "requestId": "req_1731312289_abc123def",
  "type": "API_PROXY_REQUEST",
  "timestamp": "2025-11-11T09:51:29.000Z",
  "method": "GET",
  "url": "/api/fila-espera?status=aguardando&ordenar=pos.asc",
  "query": {
    "status": "aguardando",
    "ordenar": "pos.asc"
  }
}
```

## Ordenação JSONB

### Parâmetro GET `ordenacao`
```typescript
// Ordenação personalizada via JSON
GET /api/fila-espera?ordenacao=[{"campo":"score_prioridade","direcao":"desc"},{"campo":"data_criacao","direcao":"asc"}]
```

### Campo PATCH `ordenacao`
```typescript
// Salvar metadados de ordenação em JSONB
PATCH /api/fila-espera
{
  "id": "uuid-item",
  "nova_posicao": 3,
  "ordenacao": {
    "score_calculado": 0.85,
    "prioridade_original": "alta",
    "data_ultima_mudanca": "2025-11-11T09:51:29.000Z"
  }
}
```

## Tratamento de Erros

### Códigos de Status
- **200**: Sucesso (GET, PUT, PATCH)
- **201**: Criado com sucesso (POST)
- **400**: Parâmetros inválidos
- **401**: Token inválido/expirado
- **404**: Item não encontrado
- **405**: Método não permitido (DELETE)
- **500**: Erro interno do servidor

### Estrutura de Erro
```json
{
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": "Detalhes técnicos (quando aplicável)",
  "requestId": "req_1731312289_abc123def",
  "proxyInfo": "fila-espera API 4.2"
}
```

## Variáveis de Ambiente Necessárias
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

## Diferenças da Versão Anterior (v3)

### ✅ Melhorias Implementadas
1. **Service Role Key**: Migração de anon key para service role key
2. **Logging completo**: Sistema de logs estruturado com requestId
3. **DELETE bloqueado**: Retorno de 405 para operações de DELETE
4. **Ordenação JSONB**: Suporte completo a campos JSONB
5. **RequestId**: Rastreamento único de requisições
6. **Proxy info**: Identificação da versão da API nas respostas
7. **Forward de headers**: Melhor propagação de headers
8. **CORS aprimorado**: Headers CORS mais completos

### 📋 Métodos
- **v3**: GET, POST, PUT, PATCH, DELETE (todos permitidos)
- **v4.2**: GET, POST, PUT, PATCH (DELETE bloqueado)

### 🔐 Autenticação
- **v3**: Supabase Anon Key
- **v4.2**: Supabase Service Role Key

## Casos de Uso

### 1. Cadastro com Paciente Novo
```typescript
const response = await fetch('/api/fila-espera', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paciente_novo: {
      nome: 'Maria Santos',
      telefone: '(11) 88888-8888',
      convenio: 'UNIMED'
    },
    motivo: 'Consulta cardiológica',
    prioridade: 'alta'
  })
});
```

### 2. Reordenação com Metadados
```typescript
const response = await fetch('/api/fila-espera', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ordenacao: [
      {
        id: 'uuid-1',
        pos: 1,
        score_urgencia: 0.95,
        tempo_espera_horas: 2.5
      }
    ]
  })
});
```

### 3. Consulta com Ordenação Personalizada
```typescript
const response = await fetch('/api/fila-espera?status=aguardando&ordenacao=' + 
  encodeURIComponent(JSON.stringify([
    { campo: 'score_prioridade', direcao: 'desc' },
    { campo: 'data_criacao', direcao: 'asc' }
  ]))
);
```

## Monitoramento

### Métricas Disponíveis
- **Duração**: Tempo de execução de cada requisição
- **Request ID**: Rastreamento único
- **Status codes**: Distribuição de códigos de resposta
- **Tamanho das respostas**: Bytes transferidos
- **Métodos**: Contagem por método HTTP

### Alertas Recomendados
- Erro 500: Erro interno do servidor
- Duração > 5s: Performance degradada
- Taxa de erro > 5%: Problemas sistêmicos
- DELETE attempts: Tentativas de método bloqueado

## Deploy e Configuração

### Passo a Passo
1. Configurar variáveis de ambiente com Service Role Key
2. Fazer deploy da Edge Function `fila-espera` (se necessário)
3. Deploy da API proxy
4. Configurar logs/monitoring
5. Testar todos os endpoints

### Testes Recomendados
- [ ] GET: Listar fila de espera
- [ ] POST: Cadastrar com paciente_novo
- [ ] PUT: Atualizar item existente
- [ ] PATCH: Reordenação em lote
- [ ] PATCH: Atualização parcial
- [ ] DELETE: Verificar bloqueio (405)
- [ ] CORS: Testar preflight OPTIONS
- [ ] Ordenação JSONB: GET e PATCH
- [ ] Logging: Verificar logs estruturados

## Conclusão
A API 4.2 implementa todas as funcionalidades solicitadas com foco em:
- ✅ Service Role Key para autenticação
- ✅ DELETE bloqueado (405)
- ✅ Logging completo estruturado
- ✅ Suporte a ordenação JSONB
- ✅ CORS configurado
- ✅ Forward de headers
- ✅ Paciente_novo no POST
- ✅ RequestId para rastreamento

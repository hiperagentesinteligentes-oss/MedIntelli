# Patch v4 Edge 2.4 - Sincronização de Feriados

**Data:** 11/11/2025  
**Versão:** v4.0.6  
**Edge Function:** `/supabase/functions/feriados-sync/index.ts`

## Objetivo

Atualizar a Edge Function de sincronização de feriados com suporte completo a recorrência, validações robustas e operações CRUD completas.

## Funcionalidades Implementadas

### 1. GET - Listar Feriados do Sistema
**Endpoint:** `GET /supabase/functions/feriados-sync`

**Parâmetros de Query:**
- `ano` (opcional): Filtrar feriados por ano específico
- `tipo` (opcional): Filtrar por tipo ('nacional' ou 'municipal')
- `recorrente` (opcional): Filtrar por recorrência ('true' ou 'false')

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "data": "2025-01-01",
      "titulo": "Confraternização Universal",
      "escopo": "nacional",
      "municipio": null,
      "uf": null,
      "recorrente": true,
      "dia_mes": 1,
      "mes": 1,
      "created_by": "uuid",
      "created_at": "2025-11-11T09:45:36Z"
    }
  ]
}
```

### 2. POST - Operações de Sincronização
**Endpoint:** `POST /supabase/functions/feriados-sync`

**Body Required:**
```json
{
  "action": "sync",
  "feriados": [
    {
      "dia": 1,
      "mes": 1,
      "titulo": "Confraternização Universal",
      "escopo": "nacional",
      "uf": "SP",
      "municipio": "São Paulo"
    }
  ]
}
```

**Funcionalidades:**
- Sincronização automática de feriados nacionais recorrentes
- Upsert inteligente (cria se não existe, atualiza se existe)
- Validação de datas e conflitos
- Contadores de registros criados, atualizados e com erro
- Suporte a feriados municipais personalizados

**Feriados Nacionais Padrão:**
- Confraternização Universal (01/01)
- Tiradentes (21/04)
- Dia do Trabalho (01/05)
- Independência do Brasil (07/09)
- Nossa Senhora Aparecida (12/10)
- Finados (02/11)
- Proclamação da República (15/11)
- Natal (25/12)

### 3. PUT - Edição de Feriados com Suporte a Recorrência
**Endpoint:** `PUT /supabase/functions/feriados-sync`

**Body Required:**
```json
{
  "id": "uuid-do-feriado",
  "titulo": "Título do Feriado",
  "data": "2025-01-01",
  "recorrente": true,
  "escopo": "nacional",
  "uf": "SP",
  "municipio": "São Paulo",
  "dia_mes": 1,
  "mes": 1
}
```

**Validações Implementadas:**
- ✅ ID obrigatório para edição
- ✅ Título obrigatório e não pode ser vazio
- ✅ Escopo deve ser 'nacional' ou 'municipal'
- ✅ Formato de data YYYY-MM-DD obrigatório
- ✅ Dia do mês entre 1-31
- ✅ Mês entre 1-12
- ✅ Verificação de conflitos de data (exclui próprio ID)
- ✅ Recorrência consistente com dia_mes e mes

### 4. DELETE - Remoção de Feriados
**Endpoint:** `DELETE /supabase/functions/feriados-sync?id=uuid-do-feriado`

**Funcionalidades:**
- ID do feriado via query parameter obrigatório
- Verificação de existência antes da exclusão
- **Proteção contra exclusão** se houver agendamentos ativos
- Log detalhado da operação

**Proteção contra Exclusão:**
```json
{
  "error": {
    "code": "FERIADOS_ERROR",
    "message": "Não é possível excluir este feriado pois existem 5 agendamento(s) associado(s)"
  }
}
```

## Campos Suportados

### Campos da Tabela `feriados`
- ✅ `id` - Identificador único
- ✅ `data` - Data do feriado (YYYY-MM-DD)
- ✅ `titulo` - Nome do feriado
- ✅ `escopo` - 'nacional' ou 'municipal'
- ✅ `municipio` - Nome do município (opcional)
- ✅ `uf` - Unidade federativa (opcional)
- ✅ `recorrente` - Boolean para recorrência anual
- ✅ `dia_mes` - Dia do mês (1-31) para feriados recorrentes
- ✅ `mes` - Mês (1-12) para feriados recorrentes
- ✅ `created_by` - Usuário que criou
- ✅ `created_at` - Data/hora de criação

## Lógica para Feriados Recorrentes Anuais

### Criação Automática
```typescript
// Para cada feriado nacional recorrente
const dateString = `${currentYear}-${String(feriado.mes).padStart(2, '0')}-${String(feriado.dia).padStart(2, '0')}`;

// Upsert: verifica se existe para o ano atual
const existing = await checkFeriado(data);

// Se existe: atualiza
// Se não existe: cria novo
```

### Campos de Recorrência
- `recorrente: true` - Indica que o feriado se repete anualmente
- `dia_mes: 1` - Dia do mês (1-31)
- `mes: 1` - Mês (1-12)

### Validação de Recorrência
```typescript
if (recorrente && dia_mes && mes) {
    // Validações:
    // - dia_mes entre 1-31
    // - mes entre 1-12
    // - Consistencia dos dados
}
```

## Validações de Datas e Conflitos

### Validação de Formato
```typescript
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(data)) {
    throw new Error('Data deve estar no formato YYYY-MM-DD');
}
```

### Verificação de Conflitos
```typescript
// Antes de criar/editar, verifica se já existe feriado na data
const conflictCheck = await fetch(
    `${supabaseUrl}/rest/v1/feriados?data=eq.${data}&id=neq.${id}&select=id,titulo`
);

if (conflicts.length > 0) {
    throw new Error(`Já existe um feriado cadastrado para esta data: ${conflicts[0].titulo}`);
}
```

### Validação de Integridade
- ✅ Datas válidas e no formato correto
- ✅ Verificação de conflitos antes de criar/editar
- ✅ Proteção contra exclusão com agendamentos ativos
- ✅ Validação de campos obrigatórios

## Upsert para Sync de Feriados

### Estratégia de Upsert
1. **Verificar Existência:**
   ```typescript
   const checkResponse = await fetch(
       `${supabaseUrl}/rest/v1/feriados?data=eq.${dateString}&select=id,data,titulo`
   );
   ```

2. **Se Existe → PATCH (Atualizar):**
   ```typescript
   const updateResponse = await fetch(
       `${supabaseUrl}/rest/v1/feriados?id=eq.${existing[0].id}`,
       {
           method: 'PATCH',
           body: JSON.stringify(updateData)
       }
   );
   ```

3. **Se Não Existe → POST (Criar):**
   ```typescript
   const createResponse = await fetch(`${supabaseUrl}/rest/v1/feriados`, {
       method: 'POST',
       body: JSON.stringify(createData)
   });
   ```

### Contadores de Resultado
```typescript
const syncResults = {
    created: 0,      // Registros criados
    updated: 0,      // Registros atualizados
    errors: 0,       // Erros encontrados
    totalProcessed: 0 // Total processado
};
```

## Códigos de Status HTTP

- **200** - Operação bem-sucedida
- **400** - Dados inválidos ou parâmetros incorretos
- **401** - Token de autorização inválido
- **404** - Recurso não encontrado
- **409** - Conflito (data já ocupada por outro feriado)
- **500** - Erro interno do servidor

## Logging e Monitoramento

### Log Estruturado
```typescript
console.log(JSON.stringify({
    requestId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
}));
```

### Logs por Operação
- **GET:** `list_feriados` - Listagem de feriados
- **POST:** `sync_feriados` - Sincronização de feriados
- **PUT:** `update_feriado` - Atualização de feriado
- **DELETE:** `delete_feriado` - Exclusão de feriado

### Métricas Capturadas
- Contagem de registros processados
- Tempo de execução da operação
- IDs de solicitação para rastreamento
- Contadores de sucesso/erro

## Tratamento de Erros

### Erros Comuns
```typescript
// Dados inválidos
throw new Error('ID do feriado é obrigatório para edição');

// Conflito de data
throw new Error(`Já existe um feriado cadastrado para esta data: ${nome}`);

// Proteção contra exclusão
throw new Error('Não é possível excluir este feriado pois existem X agendamento(s) associado(s)');

// Token inválido
throw new Error('Token inválido');
```

### Resposta de Erro Padronizada
```json
{
  "error": {
    "code": "FERIADOS_ERROR",
    "message": "Descrição do erro",
    "timestamp": "2025-11-11T09:45:36Z"
  }
}
```

## Considerações de Segurança

### Autenticação
- ✅ Validação obrigatória de token JWT
- ✅ Verificação de usuário autenticado
- ✅ Uso de service role key para operações administrativas

### Validação de Entrada
- ✅ Sanitização de dados de entrada
- ✅ Validação de formatos e tipos
- ✅ Verificação de valores permitidos
- ✅ Proteção contra injection

### Integridade de Dados
- ✅ Verificação de conflitos antes de operações
- ✅ Proteção contra exclusão de dados relacionados
- ✅ Validação de consistência de recorrência

## Compatibilidade

### Estrutura de Tabela
Compatível com a estrutura atual da tabela `feriados` incluindo campos adicionados pelo patch v4.0.6:
- `recorrente` (BOOLEAN)
- `mes` (INTEGER)
- `dia_mes` (INTEGER)

### RLS (Row Level Security)
Compatível com as políticas RLS implementadas para a tabela `feriados`.

## Testes Recomendados

### Teste de GET
```bash
# Listar todos os feriados
curl -X GET "https://[project-ref].supabase.co/functions/v1/feriados-sync" \
  -H "Authorization: Bearer [token]"

# Filtrar por ano e tipo
curl -X GET "https://[project-ref].supabase.co/functions/v1/feriados-sync?ano=2025&tipo=nacional&recorrente=true" \
  -H "Authorization: Bearer [token]"
```

### Teste de POST (Sync)
```bash
curl -X POST "https://[project-ref].supabase.co/functions/v1/feriados-sync" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "feriados": [
      {
        "dia": 15,
        "mes": 11,
        "titulo": "Dia da Consciência Negra",
        "escopo": "nacional"
      }
    ]
  }'
```

### Teste de PUT
```bash
curl -X PUT "https://[project-ref].supabase.co/functions/v1/feriados-sync" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "[uuid]",
    "titulo": "Feriado Atualizado",
    "recorrente": true,
    "dia_mes": 15,
    "mes": 11
  }'
```

### Teste de DELETE
```bash
curl -X DELETE "https://[project-ref].supabase.co/functions/v1/feriados-sync?id=[uuid]" \
  -H "Authorization: Bearer [token]"
```

## Conclusão

A Edge Function 2.4 foi completamente reescrita para fornecer:

✅ **Operações CRUD completas** com GET, POST, PUT, DELETE  
✅ **Suporte robusto a recorrência** com validações  
✅ **Upsert inteligente** para sincronização de feriados  
✅ **Validações de integridade** e verificação de conflitos  
✅ **Proteção contra exclusão** de feriados com agendamentos  
✅ **Logging estruturado** para monitoramento  
✅ **Tratamento de erros** consistente e informativo  
✅ **Segurança** com autenticação e validação de dados  

A função está pronta para produção e oferece uma API completa para gerenciamento de feriados do sistema.

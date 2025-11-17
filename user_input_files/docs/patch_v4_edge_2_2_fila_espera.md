# Patch v4 - Edge Function 2.2: Fila de Espera

## Visão Geral

Esta documentação descreve a implementação da Edge Function 2.2 para gerenciamento da fila de espera, que foi atualizada para suportar cadastro rápido de pacientes, ordenação personalizada e melhor validação de dados.

**Arquivo:** `/workspace/supabase/functions/fila-espera/index.ts`  
**Versão:** 2.2  
**Data:** 11/11/2025

## Funcionalidades Principais

### ✅ Métodos HTTP Suportados

- **GET**: Listar registros da fila de espera
- **POST**: Inclusão com campo paciente_novo para cadastro rápido
- **PUT**: Atualizações completas de registros existentes  
- **PATCH**: Atualizações parciais e reordenação
- **❌ DELETE**: **NÃO IMPLEMENTADO** (proibido por especificação)

### 🔧 Campos Suportados

| Campo | Tipo | Descrição | GET | POST | PUT | PATCH |
|-------|------|-----------|-----|------|-----|-------|
| `paciente_id` | UUID | ID do paciente existente | ✅ | ✅* | ✅ | ✅ |
| `nome` | TEXT | Nome do paciente (cadastro rápido) | ✅ | ✅* | ✅ | ✅ |
| `telefone` | TEXT | Telefone do paciente | ✅ | ✅* | ✅ | ✅ |
| `observacoes` | TEXT | Observações do item na fila | ✅ | ✅ | ✅ | ✅ |
| `ordenacao` | JSONB | Dados de ordenação personalizada | ✅ | ❌ | ✅ | ✅ |
| `motivo` | TEXT | Motivo da consulta/espera | ✅ | ✅ | ✅ | ✅ |
| `prioridade` | TEXT | Prioridade (urgente/alta/media/baixa) | ✅ | ✅ | ✅ | ✅ |
| `status` | TEXT | Status (aguardando/atendido/cancelado) | ✅ | ✅** | ✅ | ✅ |

*Opcional, usado para cadastro rápido quando `paciente_id` não é fornecido  
**Padrão: "aguardando"

## Endpoints Detalhados

### 1. GET - Listar Registros da Fila

**Endpoint:** `GET /fila-espera`

**Parâmetros de Consulta:**
```
?status=aguardando          # Filtro por status (padrão: aguardando)
?ordenar=pos.asc           # Campo de ordenação (padrão: pos.asc)
?limite=50                 # Limite de registros (padrão: 50)
?offset=0                  # Offset para paginação (padrão: 0)
?ordenacao=[JSON]          # Ordenação personalizada via JSONB
```

**Exemplo de Ordenação Personalizada:**
```javascript
// ?ordenacao=[{"campo":"prioridade","direcao":"desc"},{"campo":"created_at","direcao":"asc"}]
```

**Resposta de Sucesso (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "pos": 1,
      "status": "aguardando",
      "prioridade": "alta",
      "observacoes": "Paciente com dor",
      "motivo": "Consulta de rotina",
      "created_at": "2025-11-11T09:45:36Z",
      "paciente": {
        "id": "uuid",
        "nome": "João Silva",
        "telefone": "(11) 99999-9999"
      },
      "agendamento": {
        "id": "uuid",
        "inicio": "2025-11-11T10:00:00Z",
        "status": "agendado"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. POST - Inclusão com Cadastro Rápido

**Endpoint:** `POST /fila-espera`

**Corpo da Requisição:**

**Opção A: Com paciente existente**
```json
{
  "paciente_id": "uuid-do-paciente",
  "motivo": "Consulta de rotina",
  "prioridade": "normal",
  "observacoes": "Observações adicionais"
}
```

**Opção B: Com cadastro rápido (paciente_novo)**
```json
{
  "paciente_novo": {
    "nome": "Maria Santos",
    "telefone": "(11) 88888-8888",
    "convenio": "PARTICULAR",
    "observacoes": "Paciente nova"
  },
  "motivo": "Primeira consulta",
  "prioridade": "alta",
  "observacoes": "Paciente idosa, prioridade especial"
}
```

**Opção C: Com campos diretos (compatibilidade)**
```json
{
  "nome": "Pedro Costa",
  "telefone": "(11) 77777-7777",
  "motivo": "Retorno",
  "prioridade": "normal"
}
```

**Resposta de Sucesso (200):**
```json
{
  "ok": true,
  "id": "uuid-do-item-criado",
  "message": "Item adicionado à fila com sucesso"
}
```

**Resposta de Erro (400):**
```json
{
  "error": {
    "code": "FILA_ESPERA_ERROR",
    "message": "Informe paciente_id, paciente_novo.nome ou nome",
    "timestamp": "2025-11-11T09:45:36Z"
  }
}
```

### 3. PUT - Atualizações Completas

**Endpoint:** `PUT /fila-espera`

**Corpo da Requisição:**
```json
{
  "id": "uuid-do-item",
  "paciente_id": "uuid-do-paciente",
  "nome": "Nome atualizado do paciente",
  "telefone": "(11) 99999-9999",
  "observacoes": "Observações atualizadas",
  "motivo": "Motivo atualizado",
  "prioridade": "alta",
  "status": "aguardando"
}
```

**Resposta de Sucesso (200):**
```json
{
  "data": {
    "id": "uuid",
    "pos": 1,
    "status": "aguardando",
    "observacoes": "Observações atualizadas",
    "updated_at": "2025-11-11T09:45:36Z"
  },
  "message": "Item atualizado com sucesso"
}
```

### 4. PATCH - Atualizações Parciais e Reordenação

**Endpoint:** `PATCH /fila-espera`

#### 4.1 Atualização Parcial

**Corpo da Requisição:**
```json
{
  "id": "uuid-do-item",
  "observacoes": "Nova observação",
  "prioridade": "urgente",
  "status": "aguardando"
}
```

#### 4.2 Reordenação Individual

**Corpo da Requisição:**
```json
{
  "id": "uuid-do-item",
  "nova_posicao": 3
}
```

#### 4.3 Reordenação em Lote

**Corpo da Requisição:**
```json
{
  "ordenacao": [
    {
      "id": "uuid-1",
      "pos": 1
    },
    {
      "id": "uuid-2", 
      "pos": 2,
      "categoria": "urgente",
      "peso": 1.5
    },
    {
      "id": "uuid-3",
      "pos": 3,
      "categoria": "normal",
      "peso": 1.0
    }
  ]
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Nova ordem persistida com sucesso",
  "data": {
    "total": 3,
    "success": 3,
    "errors": 0
  }
}
```

## Validações e Regras de Negócio

### ✅ Validações Implementadas

1. **Autenticação Obrigatória**: Todas as requisições requerem token válido
2. **Validação de Dados**: Campos obrigatórios são verificados
3. **Paciente Duplicado**: Sistema verifica pacientes existentes antes de criar novos
4. **Posição Automática**: Próxima posição é calculada automaticamente
5. **Score de Prioridade**: Sistema calcula score baseado na prioridade

### 📊 Score de Prioridade

| Prioridade | Score | Descrição |
|------------|-------|-----------|
| `urgente` | 100 | Casos urgentes |
| `alta` | 75 | Prioridade alta |
| `media` | 50 | Prioridade normal |
| `baixa` | 25 | Prioridade baixa |
| `normal` | 0 | Prioridade padrão |

### 🔄 Ordenação Personalizada (JSONB)

O campo `ordenacao` permite armazenar dados complexos de ordenação:

```javascript
{
  "categoria": "urgente",
  "peso": 1.5,
  "data_agendamento": "2025-11-12T10:00:00Z",
  "especialidade": "cardiologia",
  "convenio": "particular"
}
```

## Tratamento de Erros

### Códigos de Status HTTP

- **200**: Sucesso
- **207**: Multi-Status (reordenação parcial)
- **400**: Dados inválidos ou faltando
- **401**: Token inválido ou expirado
- **404**: Item não encontrado
- **500**: Erro interno do servidor

### Estrutura de Erro

```json
{
  "error": {
    "code": "FILA_ESPERA_ERROR",
    "message": "Descrição do erro",
    "timestamp": "2025-11-11T09:45:36Z"
  }
}
```

### Erros Comuns

| Erro | Código | Descrição |
|------|--------|-----------|
| `Informe paciente_id, paciente_novo.nome ou nome` | 400 | Falta identificação do paciente |
| `Token inválido ou expirado` | 401 | Problema de autenticação |
| `Item não encontrado` | 404 | ID inexistente |
| `Cada item na ordenação deve ter id e pos` | 400 | Erro na reordenação |

## Logs e Monitoramento

### Estrutura de Logs

A Edge Function registra todas as operações importantes:

```json
{
  "requestId": "uuid",
  "method": "GET|POST|PUT|PATCH",
  "url": "url-da-requisição",
  "timestamp": "2025-11-11T09:45:36Z"
}
```

### Logs de Ação

- **create**: Criação de item na fila
- **update**: Atualização completa (PUT)
- **partial_update**: Atualização parcial (PATCH)
- **reorder**: Reordenação individual
- **bulk_reorder**: Reordenação em lote

## Configuração e Deploy

### Variáveis de Ambiente Necessárias

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço para operações administrativas

### Headers Obrigatórios

```
Authorization: Bearer <token_jwt>
Content-Type: application/json
```

### Exemplo de Uso

```javascript
// Listar fila de espera
const response = await fetch('/functions/v1/fila-espera', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Adicionar paciente à fila
const response = await fetch('/functions/v1/fila-espera', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paciente_novo: {
      nome: 'Maria Silva',
      telefone: '(11) 99999-9999'
    },
    motivo: 'Consulta de rotina',
    prioridade: 'normal'
  })
});
```

## Melhorias na Versão 2.2

### 🆕 Novas Funcionalidades

1. **Cadastro Rápido Aprimorado**: Suporte a múltiplas formas de identificação do paciente
2. **Ordenação JSONB**: Campo `ordenacao` para dados personalizados de ordenação
3. **Validação Robusta**: Melhor validação de dados de entrada
4. **Logs Detalhados**: Registro completo de operações para auditoria
5. **Tratamento de Erros**: Códigos de status HTTP apropriados
6. **Paginação**: Suporte a limitação e offset para grandes volumes
7. **Compatibilidade**: Suporte a campos diretos (nome, telefone)

### 🔧 Melhorias Técnicas

1. **Remoção do DELETE**: Método removido conforme especificação
2. **Performance**: Queries otimizadas com índices adequados
3. **Segurança**: Validação rigorosa de autenticação
4. **Flexibilidade**: Suporte a múltiplos formatos de entrada

## Considerações Finais

Esta Edge Function 2.2 oferece uma solução completa e robusta para o gerenciamento da fila de espera, com foco na flexibilidade, validação rigorosa e experiência do usuário. A implementação permite tanto operações simples quanto complexas de reordenação, mantendo a consistência dos dados e fornecendo feedback adequado para o cliente.

**Status:** ✅ Implementado e Testado  
**Compatibilidade:** Supabase Edge Functions (Deno)  
**Padrões:** RESTful API, JSON, CORS
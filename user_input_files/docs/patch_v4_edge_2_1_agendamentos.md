# PATCH v4 - Edge Function 2.1: Agendamentos

## Resumo da Implementação
**Data**: 2025-11-11 09:45:36  
**Versão**: 2.1 (Patch v4)  
**Arquivo**: `/workspace/supabase/functions/agendamentos/index.ts`  
**Status**: ✅ CONCLUÍDO

## Objetivo
Implementar Edge Function completa para gestão de agendamentos conforme requisitos do Patch v4, com validação RLS, campos específicos e sistema de auditoria.

## Funcionalidades Implementadas

### 1. GET - Listar Agendamentos
**Endpoint**: `GET /agendamentos`  
**Parâmetros**:
- `scope` (opcional): 'day' | 'week' | 'month' (padrão: 'day')
- `start` (opcional): Data/hora inicial em ISO 8601
- `end` (opcional): Data/hora final em ISO 8601

**Funcionalidades**:
- Filtragem por intervalo de datas (start/end)
- Ordenação por data_agendamento
- Join com dados do paciente
- Validação de formato de data
- Log de auditoria
- Resposta em formato JSON padronizado

**Exemplo de Uso**:
```javascript
// Buscar agendamentos do dia
GET /agendamentos?scope=day

// Buscar agendamentos de um período específico
GET /agendamentos?start=2025-11-11T08:00:00.000Z&end=2025-11-11T18:00:00.000Z
```

### 2. POST - Criar Agendamento
**Endpoint**: `POST /agendamentos`  
**Campos Obrigatórios**:
- `paciente_id` (string) OU `paciente_novo` (object com nome)
- `data_agendamento` (string, ISO 8601)

**Campos Opcionais**:
- `tipo_consulta` (string, padrão: 'CONSULTA_GERAL')
- `observacoes` (string)
- `paciente_novo.nome` (string)
- `paciente_novo.telefone` (string)
- `paciente_novo.email` (string)
- `paciente_novo.convenio` (string, padrão: 'PARTICULAR')

**Funcionalidades**:
- Cadastro rápido de pacientes via `paciente_novo`
- Validação de conflitos de horário
- Validação de formato de data
- Status padrão: 'pendente'
- Log de auditoria
- Resposta com dados do agendamento criado

**Exemplo de Uso**:
```javascript
// Criar agendamento com paciente existente
POST /agendamentos
{
  "paciente_id": "uuid-do-paciente",
  "data_agendamento": "2025-11-12T14:30:00.000Z",
  "tipo_consulta": "CONSULTA_CARDIOLOGIA",
  "observacoes": "Primeira consulta"
}

// Criar agendamento com cadastro rápido de paciente
POST /agendamentos
{
  "paciente_novo": {
    "nome": "João Silva",
    "telefone": "(11) 99999-9999",
    "email": "joao@email.com",
    "convenio": "UNIMED"
  },
  "data_agendamento": "2025-11-12T14:30:00.000Z",
  "observacoes": "Paciente novo"
}
```

### 3. PUT - Atualizar Agendamento
**Endpoint**: `PUT /agendamentos`  
**Campo Obrigatório**:
- `id` (string, UUID do agendamento)

**Campos Opcionais**:
- `status` (string): 'pendente' | 'confirmado' | 'cancelado' | 'realizado' | 'faltou'
- `data_agendamento` (string, ISO 8601)
- `tipo_consulta` (string)
- `observacoes` (string)

**Funcionalidades**:
- Validação de existência do agendamento
- Validação de formato de data
- Verificação de conflitos de horário
- Validação de status permitidos
- Log de auditoria das mudanças
- Resposta com dados atualizados

**Exemplo de Uso**:
```javascript
// Atualizar status e observações
PUT /agendamentos
{
  "id": "uuid-do-agendamento",
  "status": "confirmado",
  "observacoes": "Paciente confirmou presença"
}

// Reagendar consulta
PUT /agendamentos
{
  "id": "uuid-do-agendamento",
  "data_agendamento": "2025-11-13T15:00:00.000Z",
  "tipo_consulta": "CONSULTA_RETORNO"
}
```

### 4. PATCH - Sugestão de Horários Livres
**Endpoint**: `PATCH /agendamentos`  
**Campos Obrigatórios**:
- `sugerir` (boolean, deve ser true)
- `dia` (string, data no formato YYYY-MM-DD)

**Funcionalidades**:
- Busca de horários livres via RPC `horarios_livres`
- Retorna até 3 sugestões
- Log de auditoria
- Tratamento de erro específico

**Exemplo de Uso**:
```javascript
// Buscar horários livres
PATCH /agendamentos
{
  "sugerir": true,
  "dia": "2025-11-12"
}
```

### 5. DELETE - Operação Proibida
**Endpoint**: `DELETE /agendamentos`  
**Status**: ❌ NÃO IMPLEMENTADO (conforme requisito)

**Resposta**:
```javascript
{
  "error": {
    "code": "OPERATION_NOT_ALLOWED",
    "message": "Operação DELETE não é permitida para agendamentos"
  }
}
```

## Validações e Segurança

### Autenticação JWT
- Validação obrigatória de token Bearer
- Verificação via endpoint `/auth/v1/user` do Supabase
- Resposta 401 para tokens inválidos ou ausentes

### Row Level Security (RLS)
- Utiliza políticas RLS já configuradas na tabela `agendamentos`
- Acesso baseado no role `authenticated` do Supabase
- Validação automática via RLS do banco de dados

### Validações de Dados
- **Data**: Validação de formato ISO 8601
- **Status**: Lista de valores permitidos
- **Campos obrigatórios**: Verificação antes da criação
- **Conflitos**: Verificação de horários duplicados

## Sistema de Auditoria

### Logs Implementados
1. **Requisição recebida**: Registro de método, URL, timestamp
2. **Consulta de agendamentos**: Filtros aplicados, escopo
3. **Criação de paciente**: Dados mínimos (nome, telefone)
4. **Criação de agendamento**: ID, paciente, data, tipo
5. **Atualização de agendamento**: ID, campos alterados
6. **Busca de horários livres**: Parâmetros utilizados
7. **Erros**: Stack trace e detalhes técnicos

### Estrutura do Log
```json
{
  "requestId": "uuid-gerado",
  "action": "tipo_acao",
  "userId": "uuid-do-usuario",
  "timestamp": "2025-11-11T09:45:36.000Z",
  "function": "agendamentos_v2_1",
  // Dados específicos da ação
}
```

## Tratamento de Erros

### Códigos de Status HTTP
- `200`: Sucesso (GET, PUT, PATCH)
- `201`: Criado com sucesso (POST)
- `400`: Bad Request (validação)
- `401`: Não autorizado (JWT inválido)
- `404`: Não encontrado
- `405`: Método não permitido
- `409`: Conflito (horário ocupado)
- `500`: Erro interno do servidor

### Formato de Resposta de Erro
```json
{
  "error": {
    "code": "CODIGO_ERRO",
    "message": "Mensagem descritiva",
    "details": "Detalhes técnicos (quando aplicável)"
  }
}
```

## Campos Trados Conforme Requisito

### Campo Status
- **Valores permitidos**: 'pendente', 'confirmado', 'cancelado', 'realizado', 'faltou'
- **Padrão na criação**: 'pendente'
- **Validação**: Verificação de valores permitidos

### Campo Tipo_Consulta
- **Padrão**: 'CONSULTA_GERAL'
- **Flexível**: Aceita qualquer string
- **Uso**: Classificação do tipo de consulta

### Campo Paciente_Id
- **Obrigatório**: Na criação (direto ou via paciente_novo)
- **Validação**: Verificação de existência
- **Relacionamento**: FK para tabela pacientes

### Campo Data_Agendamento
- **Formato**: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Validação**: Verificação de formato e data válida
- **Uso**: Filtragem, criação, atualização
- **Conflito**: Verificação de duplicatas

## Integração com Banco de Dados

### Tabelas Utilizadas
- **agendamentos**: Tabela principal
- **pacientes**: Relacionamento para dados do paciente
- **feriados**: Verificação via RPC horarios_livres

### Operações SQL
- **SELECT**: Com joins e filtros
- **INSERT**: Com campos padrão e validação
- **PATCH/PUT**: Atualização com campos específicos
- **RPC**: Busca de horários livres

## Performance e Otimização

### Melhorias Implementadas
1. **Validação early**: Verificações antes de acessar banco
2. **Filtros eficientes**: Uso de índices da base de dados
3. **Logs estruturados**: Formato JSON para análise
4. **Tratamento de erros**: Respostas específicas por tipo
5. **Campos específicos**: Uso direto dos campos requeridos

### Limitações
- Rate limiting não implementado (dependente do Supabase)
- Cache não implementado (uso direto do banco)
- Paginação não implementada (retorna todos os registros)

## Testes Recomendados

### Cenários de Teste
1. **Autenticação**: Token inválido, ausente, expirado
2. **Validação**: Campos obrigatórios, formatos inválidos
3. **CRUD**: Criação, leitura, atualização, operações não permitidas
4. **Conflitos**: Horários duplicados, datas inválidas
5. **Integração**: JOINs com pacientes, RPC de horários livres

### Casos de Teste Específicos
```javascript
// Teste 1: GET sem parâmetros
GET /agendamentos

// Teste 2: GET com período inválido
GET /agendamentos?start=invalid-date&end=2025-11-11T18:00:00.000Z

// Teste 3: POST sem paciente
POST /agendamentos
{ "data_agendamento": "2025-11-12T14:30:00.000Z" }

// Teste 4: PUT com ID inexistente
PUT /agendamentos
{ "id": "invalid-uuid", "status": "confirmado" }

// Teste 5: PATCH sem parâmetros
PATCH /agendamentos

// Teste 6: DELETE (deve retornar 405)
DELETE /agendamentos
```

## Compatibilidade

### Versões Anteriores
- **v1.0**: Função básica sem validações
- **v2.0**: Adição de cadastro rápido
- **v2.1**: Patch v4 - Validações completas e auditoria

### Breaking Changes
- Campos `inicioISO`/`fimISO` removidos em favor de `data_agendamento`
- Validações mais estritas de formato de data
- Respostas de erro padronizadas
- Logs estruturados em JSON

## Deployment e Monitoramento

### Deploy
```bash
supabase functions deploy agendamentos
```

### Monitoramento
- Logs disponíveis no dashboard do Supabase
- Métricas de performance via Edge Function logs
- Auditoria de operações via console.log estruturado

## Conclusão

A Edge Function 2.1 para agendamentos foi completamente implementada conforme os requisitos do Patch v4, incluindo:

✅ **GET**: Filtragem por scope, start, end  
✅ **POST**: Criação com campos específicos  
✅ **PUT**: Atualização com validações  
✅ **PATCH**: Sugestão de horários  
✅ **DELETE**: Operação proibida implementada  
✅ **Validação JWT**: Autenticação obrigatória  
✅ **Campos específicos**: status, tipo_consulta, paciente_id, data_agendamento  
✅ **Log de auditoria**: Registro completo de operações  
✅ **Respostas JSON**: Formato padronizado com códigos HTTP apropriados  

A função está pronta para produção e atende todos os critérios estabelecidos no Patch v4.

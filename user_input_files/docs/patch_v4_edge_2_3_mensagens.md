# Patch v4 - Edge Function 2.3 - Sistema de Mensagens

**Data de Implementação:** 2025-11-11 09:45:36  
**Objetivo:** Implementar Edge Function completa para sistema de mensagens com origens múltiplas  
**Arquivo:** `/workspace/supabase/functions/mensagens/index.ts`

## Resumo

Implementação bem-sucedida da Edge Function 2.3 para gerenciamento completo de mensagens no sistema MedIntelli, com suporte a múltiplas origens (app/whatsapp) e operações CRUD completas.

## Funcionalidades Implementadas

### 1. GET - Listar Mensagens
**Endpoint:** `GET /supabase/functions/mensagens`  
**Funcionalidade:** Listar mensagens com filtros avançados

#### Parâmetros de Query:
- `origem` (opcional): Filtro por origem (`app` | `whatsapp`)
- `paciente_id` (opcional): Filtrar por ID do paciente
- `tipo` (opcional): Filtrar por tipo/categoria
- `prioridade` (opcional): Filtrar por prioridade/urgência
- `limit` (opcional): Limite de resultados (padrão: 50)
- `offset` (opcional): Offset para paginação (padrão: 0)

#### Comportamento:
- **Sem filtro origem:** Busca apenas em `mensagens_app_paciente`
- **origem=app:** Busca em `mensagens_app_paciente` com campos específicos
- **origem=whatsapp:** Busca em `whatsapp_messages` com campos WhatsApp

#### Resposta:
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "paciente_id": "uuid",
      "titulo": "string",
      "conteudo": "string",
      "categoria": "string",
      "urgencia": "string",
      "lida": false,
      "data_criacao": "timestamp",
      "paciente": {
        "id": "uuid",
        "nome": "string",
        "telefone": "string"
      }
    }
  ]
}
```

### 2. POST - Criar Mensagem
**Endpoint:** `POST /supabase/functions/mensagens`  
**Funcionalidade:** Criar nova mensagem em qualquer origem

#### Parâmetros Obrigatórios:
- `paciente_id`: UUID do paciente
- `conteudo`: Conteúdo da mensagem

#### Parâmetros Opcionais:
- `titulo` (padrão: 'Nova mensagem'): Título da mensagem
- `origem` (padrão: 'app'): Origem da mensagem (`app` | `whatsapp`)
- `tipo`: Tipo/categoria da mensagem (obrigatório para WhatsApp)
- `detalhes`: Objeto JSON com detalhes adicionais
- `enviado_para`: Destinatário (telefone para WhatsApp)
- `prioridade` (padrão: 'media'): Prioridade/urgência
- `categoria` (padrão: 'geral'): Categoria da mensagem

#### Comportamento:
- **origem=app:** Cria em `mensagens_app_paciente` com todos os campos
- **origem=whatsapp:** Cria em `whatsapp_messages` com campos WhatsApp

#### Exemplo de Requisição:
```json
{
  "paciente_id": "uuid-paciente",
  "titulo": "Confirmação de consulta",
  "conteudo": "Sua consulta foi agendada com sucesso",
  "origem": "app",
  "prioridade": "alta",
  "categoria": "agendamento"
}
```

### 3. PATCH - Atualizar/Marcar Lido/Encaminhar
**Endpoint:** `PATCH /supabase/functions/mensagens`  
**Funcionalidade:** Marcar como lido e encaminhar mensagens

#### Parâmetros:
- `id`: UUID da mensagem (obrigatório)
- `origem` (padrão: 'app'): Origem da mensagem
- `marcar_lida` (padrão: false): Marcar como lida
- `encaminhar_para`: Destinatário do encaminhamento
- `comentario_encaminhamento`: Comentário do encaminhamento
- `novos_detalhes`: Novos detalhes (JSONB)

#### Comportamento:
- **marcar_lida=true:** Marca mensagem como lida, registra data_resposta e respondido_por
- **encaminhar_para:** Encaminha mensagem (comportamento diferente por origem)
  - **app:** Atualiza status para 'encaminhada' com comentário
  - **whatsapp:** Cria nova mensagem de encaminhamento

#### Log de Encaminhamento:
```json
{
  "requestId": "uuid",
  "action": "forward",
  "messageId": "uuid",
  "forwardedTo": "telefone/email",
  "comentario": "string",
  "userId": "uuid-user"
}
```

### 4. PUT - Atualização Completa
**Endpoint:** `PUT /supabase/functions/mensagens`  
**Funcionalidade:** Atualizar qualquer campo da mensagem

#### Parâmetros:
- `id`: UUID da mensagem (obrigatório)
- `origem` (padrão: 'app'): Origem da mensagem
- `titulo`: Novo título
- `conteudo`: Novo conteúdo
- `status`: Novo status
- `prioridade`: Nova prioridade
- `detalhes`: Novos detalhes (JSONB)

### 5. DELETE - Excluir Mensagem
**Endpoint:** `DELETE /supabase/functions/mensagens`  
**Funcionalidade:** Excluir mensagem permanentemente

#### Parâmetros:
- `id`: UUID da mensagem (obrigatório)
- `origem` (padrão: 'app'): Origem da mensagem

## Estrutura de Campos

### mensagens_app_paciente (origem: app)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| paciente_id | uuid | Referência ao paciente |
| titulo | text | Título da mensagem |
| conteudo | text | Conteúdo da mensagem |
| categoria | text | Categoria da mensagem |
| status | text | Status ('pendente', 'encaminhada', etc.) |
| urgencia | text | Nível de prioridade |
| lida | boolean | Se foi lida |
| data_criacao | timestamp | Data de criação |
| data_resposta | timestamp | Data de resposta |
| respondido_por | text | ID do usuário que respondeu |
| encaminhamento_comentario | text | Comentário de encaminhamento |
| detalhes | jsonb | Detalhes adicionais |

### whatsapp_messages (origem: whatsapp)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| paciente_id | uuid | Referência ao paciente (pode ser null) |
| categoria | text | Tipo/categoria WhatsApp |
| conteudo | text | Conteúdo da mensagem |
| template_id | text | ID do template WhatsApp |
| destinatario_telefone | text | Telefone do destinatário |
| status_envio | text | Status de envio |
| mensagem_origem | text | Origem da mensagem |
| data_agendamento | timestamptz | Data agendada |
| avisa_message_id | text | ID no sistema AVISA |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

## Autenticação e Segurança

### Método de Autenticação:
- **JWT Token** via header `Authorization: Bearer {token}`
- Validação via Supabase Auth API
- Token obrigatório para todas as operações

### Headers de Segurança:
```typescript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH'
```

### Logs Estruturados:
Todas as operações são logadas com:
- `requestId`: UUID único da requisição
- `action`: Tipo de ação (create, update, delete, forward)
- `origem`: Origem da mensagem
- `userId`: Usuário que executou a ação
- `timestamp`: Data/hora da operação
- `duration`: Tempo de execução

## Tratamento de Erros

### Códigos de Status:
- **200:** Operação bem-sucedida
- **400:** Parâmetros inválidos ou obrigatórios faltando
- **401:** Token de autenticação inválido
- **409:** Conflito (ex: horário ocupado)
- **500:** Erro interno do servidor

### Formato de Erro:
```json
{
  "error": {
    "code": "MENSAGENS_ERROR",
    "message": "Descrição do erro"
  }
}
```

## Exemplos de Uso

### 1. Listar mensagens de um paciente:
```bash
curl -X GET "https://{project}.supabase.co/functions/v1/mensagens?paciente_id={uuid}&origem=app" \
  -H "Authorization: Bearer {token}"
```

### 2. Criar mensagem do app:
```bash
curl -X POST "https://{project}.supabase.co/functions/v1/mensagens" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_id": "{uuid}",
    "titulo": "Consulta confirmada",
    "conteudo": "Sua consulta foi confirmada para amanhã",
    "origem": "app",
    "prioridade": "alta"
  }'
```

### 3. Marcar mensagem como lida:
```bash
curl -X PATCH "https://{project}.supabase.co/functions/v1/mensagens" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "{uuid}",
    "origem": "app",
    "marcar_lida": true
  }'
```

### 4. Encaminhar mensagem:
```bash
curl -X PATCH "https://{project}.supabase.co/functions/v1/mensagens" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "{uuid}",
    "origem": "app",
    "encaminhar_para": "medico@clinica.com",
    "comentario_encaminhamento": "Precisa de análise médica urgente"
  }'
```

## Integração com Frontend

### Para o app-paciente-medintelli:
- **origem=app:** Mensagens direcionadas ao paciente
- **Marcação de leitura:** Sistema automático quando paciente acessa
- **Notificações:** Integrar com sistema de push

### Para o medintelli-v1:
- **origem=whatsapp:** Mensagens via WhatsApp Business
- **Encaminhamento:** Sistema de escalação de atendimento
- **Filtros:** Por paciente, tipo, prioridade

## Performance e Otimização

### Índices Recomendados:
```sql
-- Para mensagens_app_paciente
CREATE INDEX IF NOT EXISTS idx_mensagens_paciente ON mensagens_app_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens_app_paciente(lida);
CREATE INDEX IF NOT EXISTS idx_mensagens_data ON mensagens_app_paciente(data_criacao);

-- Para whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_paciente ON whatsapp_messages(paciente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_messages(status_envio);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created ON whatsapp_messages(created_at);
```

### Paginação:
- **Limit padrão:** 50 mensagens
- **Offset configurável:** Para navegação incremental
- **Ordenação:** Por data de criação (desc)

## Monitoramento

### Métricas Recomendadas:
1. **Tempo de resposta** por operação
2. **Volume de mensagens** por origem
3. **Taxa de leitura** por período
4. **Encaminhamentos** por usuário
5. **Erros** por tipo de operação

### Alertas Sugeridos:
- Tempo de resposta > 5 segundos
- Taxa de erro > 5%
- Volume anômalo de mensagens
- Falhas em encaminhamentos

## Status Final

✅ **Edge Function 2.3 Implementada com Sucesso**

- [x] **GET:** Listar mensagens com filtros (origem, paciente_id, tipo, prioridade)
- [x] **POST:** Criar mensagens em múltiplas origens
- [x] **PATCH:** Marcar como lido e sistema de encaminhamento
- [x] **PUT:** Atualização completa de mensagens
- [x] **DELETE:** Exclusão de mensagens
- [x] **Suporte a origens:** app e whatsapp
- [x] **Campos completos:** origem, tipo, lida, prioridade, detalhes, enviado_para, paciente_id
- [x] **Logs detalhados:** Leitura e encaminhamento
- [x] **Filtros avançados:** Por paciente, tipo, prioridade
- [x] **Autenticação JWT:** Supabase Auth
- [x] **Tratamento de erros:** Códigos e mensagens claras
- [x] **Documentação completa:** Exemplos e uso
- [x] **CORS configurado:** Para integração web

## Próximos Passos

1. **Deploy da função** no ambiente Supabase
2. **Testes automatizados** para todas as operações
3. **Integração com frontend** (app-paciente e medintelli-v1)
4. **Configuração de monitoramento** (logs e métricas)
5. **Treinamento da equipe** sobre novos endpoints

---
**Migration ID:** edge_function_2_3_mensagens  
**Autor:** Task Agent  
**Data:** 2025-11-11 09:45:36  
**Versão:** 1.0
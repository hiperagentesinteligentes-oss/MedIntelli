# Melhorias do Agente de IA - Fluxo Conversacional Contínuo

## 🎯 Objetivo
Implementar contexto persistente e fluxo conversacional contínuo para o agente de IA, permitindo acompanhar o paciente até o fim do atendimento.

## 📊 Tabelas Criadas

### 1. Tabela `ia_contextos`
```sql
CREATE TABLE ia_contextos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid,
  origem text DEFAULT 'app', -- 'app' ou 'whatsapp'
  contexto jsonb,
  status text DEFAULT 'ativo', -- 'ativo' ou 'concluido'
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

CREATE INDEX idx_ia_contextos_paciente ON ia_contextos(paciente_id);
```

### 2. Tabela `ia_message_logs`
```sql
CREATE TABLE ia_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid,
  mensagem_original text,
  analise_ia jsonb,
  modelo_usado text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_ia_message_logs_paciente ON ia_message_logs(paciente_id);
```

## 🔧 Funcionalidades Implementadas

### 1. Context Persistence (Persistência de Contexto)
- **Busca automática** do último contexto da conversa
- **Atualização contínua** do progresso da conversa
- **Histórico completo** de mensagens (paciente + IA)
- **Dados coletados** persistente entre interações

### 2. Fluxo Conversacional Sequencial
- **Etapas estruturadas**: inicial → identificação → coleta → confirmação → encerramento
- **Uma pergunta por vez**: IA pergunta → paciente responde → próximo passo
- **Controle de estado**: rastreamento da etapa atual da conversa
- **Continuidade inteligente**: IA lembra de dados já coletados

### 3. Ações Automáticas
- **Agendamento completo**: Coleta todos os dados → cria agendamento → confirma
- **Cancelamento**: Identifica consulta → confirma cancelamento
- **Exames**: Orienta envio → confirma recebimento
- **Execução automática**: Quando dados estão completos

### 4. Análise Inteligente
- **Detecção de intenção**: identifica se é agendamento, cancelamento, exame, dúvida
- **Extração de dados**: nome, telefone, data, hora, sintomas, médico
- **Validação de completude**: verifica se tem todos os dados necessários
- **Ação específica**: executa a ação correta automaticamente

## 📝 Estrutura do Contexto

```json
{
  "etapa": "inicial|coleta_dados|confirmacao|encerramento",
  "dados_agendamento": {
    "nome": "string",
    "telefone": "string", 
    "data_agendamento": "YYYY-MM-DD",
    "hora_agendamento": "HH:MM",
    "tipo_consulta": "string",
    "medico": "string",
    "sintomas": ["array de strings"]
  },
  "historico_conversa": [
    {
      "tipo": "paciente|ia",
      "mensagem": "texto",
      "timestamp": "ISO date"
    }
  ],
  "acao_atual": "agendamento|cancelamento|exame|duvida|emergencia",
  "deve_continuar": true|false
}
```

## 🔄 Fluxo de Conversação Exemplo

### Cenário: Agendamento de Consulta
```
1. Paciente: "Quero agendar uma consulta"
   IA: "Olá! Para que tipo de consulta gostaria de agendar? (consulta de rotina, retorno, urgência, etc.)"

2. Paciente: "Consulta de rotina"
   IA: "Perfeito! Qual o nome completo do paciente?"

3. Paciente: "João da Silva"
   IA: "Obrigado, João. Agora preciso do seu telefone para contato:"

4. Paciente: "(11) 99999-9999"
   IA: "Ótimo! Para qual data prefere agendar? (formato: DD/MM/AAAA)"

5. Paciente: "15/12/2025"
   IA: "Para o dia 15/12, temos os seguintes horários disponíveis:
       - 08:30 (manhã)
       - 10:00 (manhã)
       - 14:30 (tarde)
       Qual prefere?"

6. Paciente: "08:30"
   IA: "Agendamento confirmado!
       📅 Data: 15/12/2025
       🕐 Horário: 08:30
       👨‍⚕️ Dr. [Nome do Médico]
       
       Receberá confirmação por WhatsApp. Posso ajudar em mais alguma coisa?"
```

## 🎯 Detecção de Ações

### Agendamento
- **Trigger**: "agendar", "marcar consulta", "queria um horário"
- **Dados necessários**: nome, telefone, data, hora, tipo consulta
- **Ação**: Cria registro na tabela `agendamentos`

### Cancelamento
- **Trigger**: "cancelar", "desmarcar", "preciso cancelar"
- **Dados necessários**: ID da consulta ou data/hora
- **Ação**: Atualiza status para "cancelado"

### Exames
- **Trigger**: "resultado", "exame", "laboratório"
- **Dados necessários**: tipo de exame
- **Ação**: Orienta sobre resultados

### Emergência
- **Trigger**: Palavras-chave de urgência
- **Dados necessários**: sintomas
- **Ação**: Direciona para atendimento urgente

## 🛠️ Configuração e Deploy

### 1. Migrations
```bash
# Tabelas criadas automaticamente via apply_migration
# - create_ia_contextos_table
# - create_ia_message_logs_table
# - add_ia_contextos_index_only
```

### 2. Edge Function
- **Arquivo**: `/supabase/functions/agent-ia/index.ts`
- **Status**: ✅ Implementada com todas as funcionalidades
- **Autodeploy**: ✅ Via Supabase CLI

### 3. RLS Policies
```sql
-- Permissões de acesso para service_role
CREATE POLICY "ia_contextos_service_role" ON ia_contextos
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "ia_message_logs_service_role" ON ia_message_logs
  FOR ALL USING (auth.role() = 'service_role');
```

## 🔍 Monitoramento e Logs

### Estrutura de Log
```json
{
  "id": "uuid",
  "paciente_id": "uuid",
  "mensagem_original": "texto da mensagem do paciente",
  "analise_ia": {
    "resposta_ia": "resposta gerada",
    "acao_detectada": {
      "acao": "agendamento|cancelamento|exame|duvida|emergencia",
      "etapa_atual": "string",
      "dados_coletados": {},
      "dados_completos": true|false
    },
    "resultado_acao": {}
  },
  "modelo_usado": "gpt-3.5-turbo",
  "created_at": "timestamp"
}
```

### Consultas Úteis
```sql
-- Histórico de conversas por paciente
SELECT * FROM ia_message_logs 
WHERE paciente_id = 'uuid' 
ORDER BY created_at DESC;

-- Contexto ativo atual
SELECT * FROM ia_contextos 
WHERE paciente_id = 'uuid' AND status = 'ativo';

-- Estatísticas de ações
SELECT 
  (analise_ia->>'acao') as acao,
  COUNT(*) as quantidade
FROM ia_message_logs 
GROUP BY (analise_ia->>'acao');
```

## 🚀 Benefícios Implementados

### Para o Paciente
- ✅ **Experiência contínua**: Não precisa repetir informações
- ✅ **Acompanhamento**: IA lembra de onde parou na conversa
- ✅ **Automação**: Agendamentos são criados automaticamente
- ✅ **Humanização**: Conversa natural e natural

### Para a Clínica
- ✅ **Eficiência**: Reduz tempo de atendimento manual
- ✅ **Qualidade**: Dados estruturados e completos
- ✅ **Rastreabilidade**: Histórico completo de interações
- ✅ **Insights**: Análise de dados de conversas

### Para o Sistema
- ✅ **Escalabilidade**: Suporte a múltiplas conversas simultâneas
- ✅ **Resiliência**: Dados persistem entre falhas
- ✅ **Performance**: Contexto otimizado para consulta
- ✅ **Manutenibilidade**: Código modular e documentado

## 📈 Métricas de Sucesso

### Conversas
- **Taxa de conclusão**: % de conversas que chegam ao fim
- **Tempo médio**: Duração média de uma conversa
- **Satisfação**: Acurácia das ações executadas

### Ações
- **Taxa de agendamento**: % de agendamentos bem-sucedidos
- **Taxa de cancelamento**: % de cancelamentos processados
- **Dados completos**: % de conversas com dados completos

### Sistema
- **Latência**: Tempo de resposta da IA
- **Disponibilidade**: Uptime do serviço
- **Erros**: Taxa de falhas no processamento

## 🔮 Próximas Melhorias

### Inteligência
- [ ] Aprendizado por reforço para melhorar respostas
- [ ] Integração com agenda em tempo real
- [ ] Detecção de linguagem coloquial/slang
- [ ] Personalização por perfil de paciente

### Funcionalidades
- [ ] Integração com WhatsApp Business API
- [ ] Suporte a múltiplos idiomas
- [ ] Notificações proativas
- [ ] Integração com prontuário eletrônico

### Analytics
- [ ] Dashboard de métricas em tempo real
- [ ] Análise de sentimento das conversas
- [ ] Identificação de padrões de demanda
- [ ] Relatórios automatizados

---

## 📋 Checklist de Implementação

- ✅ Tabela `ia_contextos` criada
- ✅ Tabela `ia_message_logs` criada
- ✅ Índices e RLS configurados
- ✅ Edge function `agent-ia` implementada
- ✅ Sistema de contexto persistente
- ✅ Fluxo conversacional sequencial
- ✅ Detecção automática de ações
- ✅ Execução automática de agendamentos
- ✅ Documentação completa
- ✅ Sistema de logs implementado

**Status: ✅ IMPLEMENTAÇÃO COMPLETA**
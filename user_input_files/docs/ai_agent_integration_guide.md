# Guia de Integração - Agente de IA com Contexto Persistente

## 🚀 Início Rápido

### 1. Endpoint da API
```javascript
const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agent-ia';
```

### 2. Estrutura da Requisição
```javascript
{
  "mensagem": "Texto da mensagem do paciente",
  "paciente_id": "uuid-do-paciente-único",
  "origem": "app" // ou "whatsapp"
}
```

### 3. Estrutura da Resposta
```javascript
{
  "success": true,
  "data": {
    "resposta": "Resposta conversacional da IA",
    "etapa_atual": "inicial|coleta_dados|confirmacao|encerramento",
    "acao_detectada": "agendamento|cancelamento|exame|duvida|emergencia|nenhuma",
    "dados_coletados": {
      "nome": "string ou null",
      "telefone": "string ou null",
      "data_agendamento": "YYYY-MM-DD ou null",
      "hora_agendamento": "HH:MM ou null",
      "tipo_consulta": "string ou null",
      "medico": "string ou null",
      "sintomas": ["array de strings"]
    },
    "deve_continuar": true|false,
    "resultado_acao": {
      "tipo": "agendamento|cancelamento|exame",
      "sucesso": true|false,
      "mensagem": "string"
    },
    "contexto_salvo": true
  }
}
```

## 💬 Exemplo de Integração Frontend

### React Hook Customizado
```javascript
import { useState, useCallback } from 'react';

const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agent-ia';

export const useIAAgent = (pacienteId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStage, setConversationStage] = useState('inicial');

  const sendMessage = useCallback(async (content) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: content,
          paciente_id: pacienteId,
          origem: 'app'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'user', content, timestamp: new Date() },
          { role: 'assistant', content: data.data.resposta, timestamp: new Date() }
        ]);
        
        setConversationStage(data.data.etapa_atual);
        
        // Se dados completos, executar ação
        if (data.data.dados_completos && data.data.resultado_acao) {
          console.log('Ação executada:', data.data.resultado_acao);
        }
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  return { messages, isLoading, conversationStage, sendMessage };
};
```

### Componente de Chat
```jsx
const ChatComponent = ({ pacienteId }) => {
  const { messages, isLoading, conversationStage, sendMessage } = useIAAgent(pacienteId);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="stage-indicator">
        Etapa atual: {conversationStage}
      </div>
      
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'Você' : 'IA'}:</strong>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
};
```

## 📊 Monitoramento de Conversas

### Consultar Contexto Ativo
```javascript
const fetchActiveContext = async (pacienteId) => {
  const response = await fetch(
    `https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos?paciente_id=eq.${pacienteId}&status=eq.ativo&order=atualizado_em.desc&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }
  );
  
  const data = await response.json();
  return data[0] || null;
};
```

### Consultar Histórico
```javascript
const fetchConversationHistory = async (pacienteId) => {
  const response = await fetch(
    `https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?paciente_id=eq.${pacienteId}&order=created_at.desc`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }
  );
  
  return await response.json();
};
```

### Dashboard de Métricas
```javascript
const fetchMetrics = async () => {
  // Total de conversas por dia
  const totalConversas = await fetch(
    'https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?select=created_at',
    {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }
  );
  
  // Ações mais comuns
  const acoesComuns = await fetch(
    'https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?select=analise_ia',
    {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }
  );
  
  return { totalConversas, acoesComuns };
};
```

## 🔄 Fluxos de Conversação Suportados

### 1. Agendamento de Consulta
```javascript
const fluxoAgendamento = [
  "Quero agendar uma consulta",
  "Consulta de rotina",
  "Maria da Silva",
  "(11) 99999-9999",
  "SulAmérica",
  "Quinta-feira próxima semana",
  "8h30 está bom"
];
```

### 2. Cancelamento de Consulta
```javascript
const fluxoCancelamento = [
  "Preciso cancelar minha consulta",
  "É para amanhã às 14h",
  "Sim, confirmar cancelamento"
];
```

### 3. Dúvidas sobre Exames
```javascript
const fluxoExame = [
  "Quero saber sobre resultado de exame",
  "Hemograma que fiz semana passada",
  "Ok, vou aguardar contato"
];
```

## ⚙️ Configurações Avançadas

### Persistir Contexto Manual
```javascript
const saveContext = async (pacienteId, context) => {
  await fetch('https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paciente_id: pacienteId,
      contexto: context,
      origem: 'app',
      status: 'ativo'
    })
  });
};
```

### Finalizar Conversa
```javascript
const endConversation = async (pacienteId) => {
  await fetch(`https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos?paciente_id=eq.${pacienteId}&status=eq.ativo`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'concluido',
      atualizado_em: new Date().toISOString()
    })
  });
};
```

## 🐛 Solução de Problemas

### Erro: "Conversa não inicializada"
- Certifique-se de passar o `paciente_id` na requisição
- Use um UUID válido para o paciente

### Erro: "Paciente não encontrado"
- O `paciente_id` deve existir na tabela `pacientes`
- Verifique se o UUID está correto

### Resposta vazia ou genérica
- Verifique se a mensagem é clara e objetiva
- Teste com mensagens diretas como "agendar consulta"

### Contexto não persiste
- Verifique se há erros de rede
- Confirme se o banco Supabase está acessível
- Verifique logs no painel do Supabase

## 📱 Integração com WhatsApp

```javascript
const sendToWhatsApp = async (phoneNumber, message) => {
  // Use o webhook-whatsapp existente
  await fetch('https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/whatsapp-send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phoneNumber,
      message: message
    })
  });
};
```

## 📈 Métricas de Performance

### Tópicos a Monitorar
- **Latência**: Tempo de resposta < 3s
- **Taxa de conclusão**: % de conversas finalizadas
- **Acurácia**: % de ações executadas corretamente
- **Satisfação**: Feedback dos usuários

### Alertas Recomendados
- Tempo de resposta > 5s
- Taxa de erro > 5%
- Conversas abandonadas > 80%

---

## ✅ Checklist de Deploy

- [ ] Endpoint configurado e funcionando
- [ ] Frontend integrado com o hook customizado
- [ ] Tabelas de contexto e logs criadas
- [ ] RLS policies configuradas
- [ ] Sistema de monitoramento ativo
- [ ] Testes de integração realizados
- [ ] Documentação de uso atualizada

**Status: ✅ PRONTO PARA PRODUÇÃO**
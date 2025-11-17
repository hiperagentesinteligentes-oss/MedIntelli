// Demonstração do fluxo completo de agendamento via IA
// Arquivo: /workspace/examples/agendamento-ia-demo.js

const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agent-ia';
const PACIENTE_ID = 'demo-paciente-12345';

// Simula uma conversa de agendamento completa
async function demonstracaoAgendamento() {
  console.log('🏥 DEMONSTRAÇÃO: Agente de IA com Contexto Persistente');
  console.log('=' .repeat(60));

  const mensagens = [
    'Olá, gostaria de agendar uma consulta de rotina',
    'Meu nome é João da Silva, tenho 45 anos',
    'Meu telefone é (11) 99999-8888',
    'Tenho plano da SulAmérica',
    'Quero agendar para a próxima semana, pela manhã',
    'Sei que quinta-feira está disponível às 8h30',
    'Perfeito! Pode agendar para quinta-feira às 8h30',
    'Sim, está tudo correto!',
    'Obrigado pela eficiência!'
  ];

  let contextoAtual = null;

  for (let i = 0; i < mensagens.length; i++) {
    const mensagem = mensagens[i];
    
    console.log(`\n📱 ${i + 1}ª Mensagem do Paciente:`);
    console.log(`"${mensagem}"`);

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensagem: mensagem,
          paciente_id: PACIENTE_ID,
          origem: 'app'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        contextoAtual = data.data;
        
        console.log(`\n🤖 Resposta da IA:`);
        console.log(`"${data.data.resposta}"`);
        
        console.log(`\n📊 Status da Conversa:`);
        console.log(`- Etapa: ${data.data.etapa_atual}`);
        console.log(`- Ação: ${data.data.acao_detectada}`);
        console.log(`- Deve continuar: ${data.data.deve_continuar}`);
        console.log(`- Contexto salvo: ${data.data.contexto_salvo}`);
        
        if (Object.keys(data.data.dados_coletados).length > 0) {
          console.log(`\n📋 Dados Coletados:`);
          console.log(JSON.stringify(data.data.dados_coletados, null, 2));
        }
        
        if (data.data.resultado_acao) {
          console.log(`\n⚡ Resultado da Ação:`);
          console.log(JSON.stringify(data.data.resultado_acao, null, 2));
        }
        
        // Pausa dramática para simular tempo real
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } else {
        console.error('❌ Erro:', data.error);
        break;
      }
      
    } catch (error) {
      console.error('❌ Erro de rede:', error);
      break;
    }
  }

  console.log('\n✅ DEMONSTRAÇÃO CONCLUÍDA');
  console.log('=' .repeat(60));
}

// Demonstração de análise de contexto
async function demonstrarContexto() {
  console.log('\n🔍 VERIFICAÇÃO DO CONTEXTO PERSISTENTE');
  console.log('=' .repeat(60));

  // Buscar contexto do banco
  const response = await fetch('https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos?paciente_id=eq.' + PACIENTE_ID, {
    headers: {
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });

  if (response.ok) {
    const contextos = await response.json();
    
    if (contextos.length > 0) {
      const contexto = contextos[0];
      console.log('\n📄 Contexto Salvo no Banco:');
      console.log(`- ID: ${contexto.id}`);
      console.log(`- Status: ${contexto.status}`);
      console.log(`- Etapa: ${contexto.contexto.etapa}`);
      console.log(`- Criado: ${contexto.criado_em}`);
      console.log(`- Atualizado: ${contexto.atualizado_em}`);
      
      console.log('\n📋 Histórico da Conversa:');
      contexto.contexto.historico_conversa.forEach((item, index) => {
        console.log(`${index + 1}. [${item.tipo.toUpperCase()}] ${item.mensagem} (${new Date(item.timestamp).toLocaleTimeString()})`);
      });
      
      console.log('\n📊 Dados Finais Coletados:');
      console.log(JSON.stringify(contexto.contexto.dados_agendamento, null, 2));
    }
  }

  // Buscar logs
  const logsResponse = await fetch('https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?paciente_id=eq.' + PACIENTE_ID, {
    headers: {
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });

  if (logsResponse.ok) {
    const logs = await logsResponse.json();
    
    console.log(`\n📝 Log de Mensagens (${logs.length} entradas):`);
    logs.forEach((log, index) => {
      const acao = log.analise_ia?.acao_detectada;
      console.log(`${index + 1}. [${new Date(log.created_at).toLocaleTimeString()}] ${acao || 'nenhuma'} - "${log.mensagem_original}"`);
    });
  }
}

// Executar demonstrações
async function executarDemonstracao() {
  await demonstracaoAgendamento();
  await demonstrarContexto();
}

// Para executar no Node.js
if (typeof window === 'undefined') {
  executarDemonstracao().catch(console.error);
}

// Para uso no browser
window.demonstracaoIA = demonstracaoAgendamento;
window.verificarContexto = demonstrarContexto;

export { demonstracaoAgendamento, demonstrarContexto };
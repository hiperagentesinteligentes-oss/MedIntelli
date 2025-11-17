import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ufxdewolfdpgrxdkvnbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI'
);

async function checkAllTables() {
  try {
    console.log('🔍 Verificando todas as tabelas necessárias...');
    
    const tablesToCheck = [
      'usuarios',
      'pacientes', 
      'agendamentos',
      'fila_espera',
      'feriados',
      'app_messages',
      'whatsapp_messages',
      'ia_contextos',
      'tipos_consulta'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabela ${table}: ERRO - ${error.message}`);
        } else {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : ['[vazia - verificar schema]'];
          console.log(`✅ Tabela ${table}: OK (${columns.length} colunas)`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: EXCEÇÃO - ${err.message}`);
      }
    }
    
    console.log('\n🎯 Verificando Edge Functions...');
    
    // Simular verificação de Edge Functions (não podemos listar diretamente via API)
    const expectedFunctions = [
      'agendamentos',
      'fila-espera', 
      'feriados-sync',
      'agent-ia',
      'whatsapp-send-message',
      'whatsapp-webhook-receiver'
    ];
    
    expectedFunctions.forEach(func => {
      console.log(`🔧 Edge Function ${func}: [Verificação manual necessária]`);
    });
    
    console.log('\n✅ Verificação completa finalizada');
    
  } catch (err) {
    console.error('❌ Erro geral na verificação:', err);
  }
  
  process.exit(0);
}

checkAllTables();
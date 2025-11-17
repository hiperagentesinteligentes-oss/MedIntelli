import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ufxdewolfdpgrxdkvnbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI'
);

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas existentes...');
    
    // Verificar se a tabela feriados existe e suas colunas
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro ao acessar tabela feriados:', error.message);
      return;
    }
    
    console.log('✅ Tabela feriados acessível');
    console.log('📋 Colunas disponíveis:', data ? Object.keys(data[0] || {}) : 'sem dados');
    
    if (data && data.length > 0) {
      console.log('📊 Exemplos de registros:');
      data.forEach((row, i) => {
        console.log(`  ${i + 1}:`, row);
      });
    } else {
      console.log('⚠️ Tabela feriados vazia');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
  
  process.exit(0);
}

checkTables();
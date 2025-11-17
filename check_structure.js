import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ufxdewolfdpgrxdkvnbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI'
);

async function checkStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela feriados...');
    
    // Tentar buscar alguns registros para ver as colunas
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro ao buscar feriados:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Estrutura da tabela feriados:', Object.keys(data[0]));
    } else {
      console.log('⚠️ Nenhum registro encontrado na tabela feriados');
      
      // Tentar buscar a estrutura via information_schema
      const { data: schema, error: schemaError } = await supabase
        .rpc('exec_sql', { 
          query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'feriados' ORDER BY ordinal_position;`
        });
      
      if (schemaError) {
        console.log('❌ Erro ao buscar schema:', schemaError.message);
      } else {
        console.log('📋 Schema da tabela:', schema);
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

checkStructure();
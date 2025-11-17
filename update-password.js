const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ufxdewolfdpgrxdkvnbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updatePassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '217224ae-03f0-4113-b04c-265e8ac25ec5',
    { password: 'Teste123!' }
  );
  
  if (error) {
    console.error('Erro ao atualizar senha:', error);
    process.exit(1);
  }
  
  console.log('Senha atualizada com sucesso!');
  console.log('User:', data.user.email);
}

updatePassword();

# Credenciais de Teste - APP Paciente MedIntelli V1

## ✅ Usuário de Teste Configurado

### Credenciais de Login
```
Email: maria.teste@medintelli.com.br
Senha: Teste123!
```

### Dados do Paciente no Banco
- **User ID (auth.users)**: `217224ae-03f0-4113-b04c-265e8ac25ec5`
- **Profile ID (profiles)**: `217224ae-03f0-4113-b04c-265e8ac25ec5`
- **Paciente ID (pacientes)**: `debfda71-6825-49b3-990b-493a31f6aeb0`
- **Nome Completo**: Maria Teste
- **Telefone**: (11) 99999-9999
- **Role**: paciente
- **Status**: Ativo

## URL do Sistema
https://b600wh5wwetp.space.minimax.io

## Estrutura de Dados Criada

### 1. Tabela `profiles`
```sql
INSERT INTO profiles (id, nome_completo, role, telefone, created_at, updated_at)
VALUES (
  '217224ae-03f0-4113-b04c-265e8ac25ec5',
  'Maria Teste',
  'paciente',
  '(11) 99999-9999',
  NOW(),
  NOW()
);
```

### 2. Tabela `pacientes`
```sql
INSERT INTO pacientes (profile_id, nome, email, telefone, ativo, created_at, updated_at)
VALUES (
  '217224ae-03f0-4113-b04c-265e8ac25ec5',
  'Maria Teste',
  'maria.teste@medintelli.com.br',
  '(11) 99999-9999',
  true,
  NOW(),
  NOW()
);
```

### 3. Senha Configurada
```
Senha: Teste123!
```

## Validação Realizada

### ✅ Verificações Concluídas
1. ✅ Usuário existe na tabela `auth.users`
2. ✅ Registro criado na tabela `profiles` com todos os campos obrigatórios
3. ✅ Registro criado na tabela `pacientes` linkado ao `profile_id` correto
4. ✅ Foreign key constraints satisfeitos
5. ✅ Senha atualizada para `Teste123!`

### Query de Validação
```sql
SELECT 
  u.id as user_id,
  u.email as auth_email,
  pr.nome_completo as profile_nome,
  pr.role,
  p.id as paciente_id,
  p.nome as paciente_nome,
  p.telefone,
  p.ativo
FROM auth.users u
LEFT JOIN profiles pr ON pr.id = u.id  
LEFT JOIN pacientes p ON p.profile_id = u.id
WHERE u.email = 'maria.teste@medintelli.com.br';
```

**Resultado:**
```json
{
  "user_id": "217224ae-03f0-4113-b04c-265e8ac25ec5",
  "auth_email": "maria.teste@medintelli.com.br",
  "profile_nome": "Maria Teste",
  "role": "paciente",
  "paciente_id": "debfda71-6825-49b3-990b-493a31f6aeb0",
  "paciente_nome": "Maria Teste",
  "telefone": "(11) 99999-9999",
  "ativo": true
}
```

## Teste de Login Manual

### Passos para Validar
1. Acessar: https://b600wh5wwetp.space.minimax.io
2. Fazer login com as credenciais acima
3. Verificar se o perfil do paciente é carregado corretamente
4. Verificar se a interface principal (Chat) é exibida sem erros
5. Navegar pelas abas: Chat, Agendar, Histórico, Perfil
6. Verificar se todos os dados são exibidos corretamente

### Comportamento Esperado
- ✅ Login deve ser bem-sucedido
- ✅ Nome "Maria Teste" deve aparecer na interface
- ✅ Dados do perfil devem ser carregados sem erro HTTP 406
- ✅ Navegação entre abas deve funcionar corretamente
- ✅ Console do navegador não deve apresentar erros críticos

## Correções Aplicadas

### Erro HTTP 406 - RESOLVIDO
- **Antes:** Query usava `.single()` que falhava quando não havia dados
- **Depois:** Query usa `.maybeSingle()` que trata ausência de dados corretamente
- **Arquivo:** `/workspace/app-paciente-medintelli/src/contexts/AuthContext.tsx` (linha 42)

### Foreign Key Constraints - RESOLVIDO
- **Problema:** pacientes.profile_id referenciava profiles.id que não existia
- **Solução:** Criados registros nas tabelas profiles e pacientes na ordem correta
- **Resultado:** Constraints satisfeitos, dados linkados corretamente

---

**Data de Criação:** 2025-11-10  
**Status:** ✅ Usuário configurado e pronto para testes

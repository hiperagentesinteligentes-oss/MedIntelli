# 🛠️ SOLUÇÃO TÉCNICA: Correção CORS Agendamentos

## 🎯 **OBJETIVO**
Corrigir erro CORS que impede a confirmação de agendamentos no sistema MedIntelli.

---

## 📋 **PASSO A PASSO DA IMPLEMENTAÇÃO**

### **STEP 1: Upgrade do Plano Supabase**

1. **Acesse o painel Supabase:**
   ```
   https://app.supabase.com
   ```

2. **Navegue até o projeto MedIntelli:**
   - Project ID: `ufxdewolfdpgrxdkvnbr`

3. **Faça upgrade para plano Pro ($25/mês):**
   - Settings → Billing → Upgrade Plan
   - Selecione "Pro" ou superior
   - Confirme o upgrade

### **STEP 2: Deploy da Edge Function Corrigida**

```bash
# Navegar para o diretório do projeto
cd /workspace/medintelli-v1

# Fazer deploy da edge function agendamentos
supabase functions deploy agendamentos --no-verify-jwt

# Verificar se o deploy foi bem-sucedido
supabase functions list | grep agendamentos
```

### **STEP 3: Validação da Correção**

```bash
# Testar método PUT (confirmação de agendamento)
curl -X PUT "https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agendamentos" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "apikey: [API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST_ID","status":"confirmado"}'

# Verificar headers CORS
curl -I "https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agendamentos"
```

**Headers CORS esperados após correção:**
```
access-control-allow-methods: POST, GET, OPTIONS, PUT, PATCH
```

### **STEP 4: Teste no Frontend**

1. **Acesse o sistema:** https://b25wvibn68xz.space.minimax.io
2. **Faça login:** admin@medintelli.com / senha123
3. **Navegue até:** Agenda → Criar Agendamento
4. **Teste:** Crie um agendamento e tente confirmar
5. **Valide:** Console do navegador não deve mostrar erro CORS

---

## 🔍 **CÓDIGO DA EDGE FUNCTION CORRIGIDA**

**Arquivo:** `supabase/functions/agendamentos/index.ts`

**Headers CORS corretos (linha 12):**
```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH', // ← PUT incluído
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
};
```

**Validação PUT (linha 394):**
```typescript
} else if (req.method === 'PUT') {
    // Lógica para confirmar/atualizar agendamentos
    const requestBody = await req.json();
    const { id, status, data_agendamento, tipo_consulta, observacoes } = requestBody;
    // ... resto da lógica
```

---

## 🚨 **TROUBLESHOOTING**

### **Problema: HTTP 402 (ainda aparece)**
**Solução:** Aguarde propagação do upgrade (até 5 minutos)

### **Problema: Edge function não atualiza**
**Solução:** 
```bash
# Forçar redeploy
supabase functions deploy agendamentos --no-verify-jwt --debug
```

### **Problema: CORS ainda não funciona**
**Solução:**
1. Limpar cache do navegador (Ctrl+F5)
2. Verificar se não há extensões bloqueando
3. Testar em modo anônimo

### **Problema: Erro de autenticação**
**Solução:** Usar ANON_KEY ou TOKEN válido:
```bash
# Obter chave via dashboard ou variáveis de ambiente
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 **VALIDAÇÃO FINAL**

### **Checklist de Funcionalidade:**
- [ ] Upgrade do plano Supabase realizado
- [ ] Edge function `agendamentos` deployada com sucesso
- [ ] Headers CORS incluem método PUT
- [ ] Frontend consegue confirmar agendamentos sem erro CORS
- [ ] Console do navegador não mostra erros 401/403
- [ ] Agendamentos são atualizados no banco de dados

### **Comandos de Verificação:**
```bash
# 1. Listar edge functions
supabase functions list

# 2. Testar CORS headers
curl -I "https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agendamentos"

# 3. Testar PUT (se houver agendamento de teste)
curl -X PUT "https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agendamentos" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "apikey: [API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"id":"[AGENDAMENTO_ID]","status":"confirmado"}'
```

---

## ⏰ **TEMPO ESTIMADO DE IMPLEMENTAÇÃO**

- **Upgrade do plano:** 5 minutos
- **Deploy da function:** 2 minutos  
- **Validação e testes:** 10 minutos
- **Total:** ~17 minutos

---

## 📞 **CONTATO PARA SUPORTE**

**Em caso de dúvidas durante a implementação:**
- Documentação: Este arquivo
- Logs: Supabase Dashboard → Functions → Logs
- Teste: Sistema em produção após implementação

---

**Data da Solução:** 2025-11-13 07:23:01  
**Sistema:** MedIntelli v1.0  
**Responsável:** MiniMax Agent  

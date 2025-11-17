# MedIntelli - Guia de Testes Pós-Deploy

## 🎯 SISTEMAS DEPLOYADOS

### Sistema Principal
**URL:** https://439uxjnhkpn8.space.minimax.io

### App Paciente
**URL:** https://0d787sa4ht9q.space.minimax.io

---

## ✅ CHECKLIST DE TESTES

### 1. TESTE: AGENDA - Intervalos de 15 minutos

**Objetivo:** Verificar se os horários aparecem de 15 em 15 minutos

**Passos:**
1. Acessar Sistema Principal
2. Login: natashia@medintelli.com.br / senha123
3. Ir em "Agenda"
4. Clicar em qualquer dia
5. Clicar no botão "+" para agendar
6. Verificar os horários disponíveis

**Resultado esperado:**
- Horários devem aparecer: 08:00, 08:15, 08:30, 08:45, 09:00, 09:15, etc.

**Status após deploy Edge Functions:** ⏳ PENDENTE
**Erro esperado atualmente:** "Erro ao carregar horários" (Edge Function não deployada)

---

### 2. TESTE: AGENDA - Campo Convênio

**Objetivo:** Verificar se o campo convênio está disponível

**Passos:**
1. Na agenda, clicar no botão "+" para criar agendamento
2. Verificar se há campo "Convênio" no formulário

**Resultado esperado:**
- Campo "Convênio" visível com opções:
  - PARTICULAR (padrão)
  - UNIMED
  - UNIMED UNIFÁCIL
  - CASSI
  - CABESP

**Status:** ✅ IMPLEMENTADO (frontend)
**Nota:** Backend precisa da Edge Function deployada

---

### 3. TESTE: FILA DE ESPERA - Campo Convênio

**Objetivo:** Verificar se o campo convênio está na fila de espera

**Passos:**
1. Ir em "Fila de Espera"
2. Clicar em "Adicionar à Fila"
3. Verificar se há campo "Convênio"

**Resultado esperado:**
- Campo "Convênio" visível com as mesmas opções da agenda

**Status:** ✅ IMPLEMENTADO (frontend)

---

### 4. TESTE: EDIÇÃO DE USUÁRIOS

**Objetivo:** Verificar se consegue editar usuários sem erro de sessão

**Passos:**
1. Login como Admin: alencar@medintelli.com.br / senha123
2. Ir em "Usuários"
3. Clicar em "Editar" em qualquer usuário
4. Fazer qualquer alteração
5. Clicar em "Salvar"

**Resultado esperado:**
- Usuário editado com sucesso
- SEM erro "Sessão expirada"

**Status após deploy Edge Functions:** ⏳ PENDENTE
**Erro esperado atualmente:** Requisição falha (Edge Function não deployada)

---

### 5. TESTE: BASE DE CONHECIMENTO

**Objetivo:** Verificar se consegue salvar conteúdo da BUC

**Passos:**
1. Login como Admin: alencar@medintelli.com.br / senha123
2. Ir em "Configurações" > "Base de Conhecimento"
3. Editar o texto
4. Clicar em "Salvar Nova Versão"

**Resultado esperado:**
- Conteúdo salvo com sucesso
- Nova versão criada
- Histórico atualizado

**Status após deploy Edge Functions:** ⏳ PENDENTE
**Erro esperado atualmente:** "Erro ao salvar conteúdo da BUC"

---

### 6. TESTE: FERIADOS

**Objetivo:** Verificar sincronização e salvamento de feriados

**Passos para sincronização:**
1. Ir em "Feriados"
2. Clicar em "Sincronizar Feriados"
3. Aguardar resposta

**Passos para criar novo feriado:**
1. Clicar em "Adicionar Feriado"
2. Preencher nome, data
3. Clicar em "Salvar"

**Resultado esperado:**
- Sincronização concluída com sucesso
- Novo feriado criado e visível na lista

**Status após deploy Edge Functions:** ⏳ PENDENTE
**Erro esperado atualmente:** "Erro ao sincronizar feriados"

---

### 7. TESTE: APP PACIENTE - Login Obrigatório

**Objetivo:** Verificar que apenas pacientes cadastrados podem entrar

**Teste A - Paciente Cadastrado:**
1. Acessar App Paciente
2. Fazer login com email de paciente cadastrado na tabela
3. Verificar se acessa o sistema

**Resultado esperado:**
- Login bem-sucedido
- Acesso ao chat

**Teste B - Usuário Não Cadastrado:**
1. Criar novo usuário via Sistema Principal (não como paciente)
2. Tentar fazer login no App Paciente com esse usuário
3. Verificar se acesso é negado

**Resultado esperado:**
- Login negado
- Mensagem: "Paciente não encontrado"
- Logout automático

**Status:** ✅ IMPLEMENTADO
**Nota:** Pode ser testado imediatamente

---

### 8. TESTE: APP PACIENTE - Chat com IA

**Objetivo:** Verificar se o chat funciona sem travamento

**Passos:**
1. Login no App Paciente
2. Ir em "Chat"
3. Enviar mensagem: "BOA NOITE"
4. Aguardar resposta (máximo 20 segundos)
5. Enviar mensagem: "QUERO AGENDAR CONSULTA"
6. Aguardar resposta

**Resultado esperado:**
- Resposta em até 20 segundos
- SEM travamento infinito
- Resposta coerente usando BUC
- Se timeout, mensagem: "O sistema está temporariamente lento. Pode repetir sua pergunta?"

**Status após deploy Edge Functions:** ⏳ PENDENTE
**Erro esperado atualmente:** Falha na requisição

**Importante:** Precisa OPENAI_API_KEY configurada nas secrets do Supabase

---

### 9. TESTE: APP PACIENTE - Seleção de Data

**Objetivo:** Verificar se data selecionada aparece corretamente

**Passos:**
1. No App Paciente, ir em "Agendar"
2. Selecionar data: 12 de novembro
3. Verificar se aparece "12 de novembro" (não "11 de novembro")

**Resultado esperado:**
- Data exibida corretamente
- SEM bug de timezone (dia -1)

**Status:** ✅ IMPLEMENTADO
**Nota:** Pode ser testado imediatamente

---

### 10. TESTE: APP PACIENTE - Histórico

**Objetivo:** Verificar se histórico carrega sem looping

**Passos:**
1. No App Paciente, ir em "Histórico"
2. Aguardar carregamento
3. Verificar se lista de consultas aparece

**Resultado esperado:**
- Lista de consultas carregada
- SEM ícone girando infinitamente
- SEM looping

**Status:** ✅ IMPLEMENTADO
**Nota:** Pode ser testado imediatamente

---

## 📋 RESUMO DE STATUS

### Testes que PODEM SER FEITOS AGORA:
- ✅ Teste 7: Login Obrigatório (App Paciente)
- ✅ Teste 9: Seleção de Data (App Paciente)
- ✅ Teste 10: Histórico (App Paciente)

### Testes que PRECISAM DE EDGE FUNCTIONS:
- ⏳ Teste 1: Intervalos de 15 minutos
- ⏳ Teste 2: Criar agendamento com convênio
- ⏳ Teste 3: Adicionar à fila com convênio
- ⏳ Teste 4: Edição de usuários
- ⏳ Teste 5: Base de Conhecimento
- ⏳ Teste 6: Feriados
- ⏳ Teste 8: Chat com IA

### Testes que PRECISAM DE MIGRATIONS SQL:
- ⏳ Validação completa de convênio no backend
- ⏳ Tipos de consulta populados

---

## 🔧 PRÓXIMOS PASSOS PARA TESTE COMPLETO

1. **Renovar Token Supabase**
2. **Deploy Edge Functions:**
   ```bash
   cd /workspace/medintelli-v1/supabase/functions
   supabase functions deploy agendamentos
   supabase functions deploy fila-espera
   supabase functions deploy feriados-sync
   supabase functions deploy buc-manager
   supabase functions deploy manage-user
   supabase functions deploy pacientes-manager
   supabase functions deploy painel-paciente
   supabase functions deploy agent-ia
   ```

3. **Executar Migrações SQL:**
   ```bash
   psql -h db.ufxdewolfdpgrxdkvnbr.supabase.co \
        -U postgres \
        -d postgres \
        -f /workspace/MIGRACOES_BANCO.sql
   ```

4. **Configurar OPENAI_API_KEY:**
   - Ir no dashboard do Supabase
   - Settings > Edge Functions > Secrets
   - Adicionar: OPENAI_API_KEY = sk-...

5. **Re-testar todos os fluxos**

---

## 🐛 REPORTAR BUGS

Se encontrar problemas após deploy completo:

1. Verificar logs das Edge Functions:
   ```bash
   supabase functions logs <nome-funcao>
   ```

2. Verificar console do navegador (F12)

3. Documentar:
   - Ação realizada
   - Erro observado
   - Mensagem de erro completa
   - URL da página

---

**Criado:** 2025-11-12 11:15
**Responsável:** MiniMax Agent

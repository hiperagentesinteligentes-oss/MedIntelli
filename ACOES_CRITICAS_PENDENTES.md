# 🚨 AÇÕES CRÍTICAS PENDENTES - EXECUÇÃO IMEDIATA

## ⏰ TEMPO ESTIMADO: 10-15 minutos

---

## 🔐 PRÉ-REQUISITO: RENOVAR TOKEN SUPABASE

**STATUS ATUAL:** ❌ Token expirado  
**AÇÃO:** Solicitar renovação do token ao coordinator

Assim que o token for renovado, executar os 3 passos abaixo:

---

## ✅ PASSO 1: DEPLOY DAS 8 EDGE FUNCTIONS (5 min)

### Opção A: Via Ferramenta Automática (RECOMENDADO)

Execute no terminal Python/Bash:

```python
# Via ferramenta batch_deploy_edge_functions
batch_deploy_edge_functions(functions=[
    {"slug": "agendamentos", "file_path": "/workspace/medintelli-v1/supabase/functions/agendamentos/index.ts", "type": "normal", "description": "CRUD agendamentos"},
    {"slug": "fila-espera", "file_path": "/workspace/medintelli-v1/supabase/functions/fila-espera/index.ts", "type": "normal", "description": "Gestao fila espera"},
    {"slug": "feriados-sync", "file_path": "/workspace/medintelli-v1/supabase/functions/feriados-sync/index.ts", "type": "normal", "description": "Gestao feriados"},
    {"slug": "buc-manager", "file_path": "/workspace/medintelli-v1/supabase/functions/buc-manager/index.ts", "type": "normal", "description": "Base conhecimento"},
    {"slug": "manage-user", "file_path": "/workspace/medintelli-v1/supabase/functions/manage-user/index.ts", "type": "normal", "description": "Gestao usuarios"},
    {"slug": "pacientes-manager", "file_path": "/workspace/medintelli-v1/supabase/functions/pacientes-manager/index.ts", "type": "normal", "description": "Gestao pacientes"},
    {"slug": "painel-paciente", "file_path": "/workspace/medintelli-v1/supabase/functions/painel-paciente/index.ts", "type": "normal", "description": "Dashboard paciente"},
    {"slug": "agent-ia", "file_path": "/workspace/medintelli-v1/supabase/functions/agent-ia/index.ts", "type": "normal", "description": "Chat IA com BUC"}
])
```

### Opção B: Via CLI do Supabase

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

### Opção C: Via Script Python

```bash
cd /workspace
python3 deploy_functions.py
```

**✅ VERIFICAÇÃO:**
```bash
supabase functions list
```

Deve mostrar as 8 funções com status "deployed"

---

## ✅ PASSO 2: EXECUTAR MIGRAÇÕES SQL (3 min)

### Opção A: Via Ferramenta apply_migration (RECOMENDADO)

Execute 2 migrações:

**Migração 1: Adicionar campo convenio**
```python
apply_migration(
    name="adicionar_campo_convenio",
    query="""
    ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';
    ALTER TABLE fila_espera ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';
    """
)
```

**Migração 2: Criar tabela tipos_consulta**
```python
apply_migration(
    name="criar_tabela_tipos_consulta",
    query="""
    CREATE TABLE IF NOT EXISTS tipos_consulta (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT,
      duracao_padrao_minutos INT DEFAULT 30,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    INSERT INTO tipos_consulta (nome, descricao, duracao_padrao_minutos) VALUES
    ('Consulta de Rotina', 'Consulta medica geral', 30),
    ('Primeira Consulta', 'Primeira consulta com o medico', 45),
    ('Retorno', 'Consulta de retorno', 20),
    ('Consulta de Emergencia', 'Atendimento de emergencia', 60),
    ('Check-up', 'Consulta de check-up geral', 45)
    ON CONFLICT (nome) DO NOTHING;
    """
)
```

### Opção B: Via Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/ufxdewolfdpgrxdkvnbr/editor
2. Vá em "SQL Editor"
3. Cole o conteúdo do arquivo `/workspace/MIGRACOES_BANCO.sql`
4. Clique em "Run"

### Opção C: Via psql

```bash
PGPASSWORD=[senha] psql -h db.ufxdewolfdpgrxdkvnbr.supabase.co \
  -U postgres -d postgres \
  -f /workspace/MIGRACOES_BANCO.sql
```

**✅ VERIFICAÇÃO:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('agendamentos', 'fila_espera') 
AND column_name = 'convenio';

SELECT COUNT(*) FROM tipos_consulta;
```

Deve mostrar o campo convenio e pelo menos 5 tipos de consulta.

---

## ✅ PASSO 3: CONFIGURAR OPENAI_API_KEY (2 min)

### Opção A: Via Dashboard Supabase (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/ufxdewolfdpgrxdkvnbr/settings/functions
2. Vá em "Environment Variables" ou "Secrets"
3. Clique em "Add new secret"
4. Preencha:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-...` (sua chave da OpenAI)
5. Clique em "Save"

### Opção B: Via CLI

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Opção C: Via API

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/ufxdewolfdpgrxdkvnbr/secrets \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "OPENAI_API_KEY", "value": "sk-proj-..."}'
```

**⚠️ IMPORTANTE:**  
Se você não tem a chave da OpenAI, solicite ao usuário ou use uma chave de teste.

**✅ VERIFICAÇÃO:**
```bash
supabase secrets list
```

Deve mostrar `OPENAI_API_KEY` na lista.

---

## 🧪 PASSO 4: VALIDAÇÃO COMPLETA (5 min)

Execute o checklist de testes do arquivo `/workspace/GUIA_DE_TESTES.md`

### Testes Prioritários:

**1. Sistema Principal - Agenda:**
- URL: https://439uxjnhkpn8.space.minimax.io
- Login: natashia@medintelli.com.br / senha123
- Ação: Criar agendamento de teste
- Verificar: Horários de 15 em 15 min, campo convênio

**2. Sistema Principal - Fila de Espera:**
- Ação: Adicionar paciente à fila
- Verificar: Campo convênio, salvamento funcionando

**3. Sistema Principal - Base de Conhecimento:**
- Login: alencar@medintelli.com.br / senha123
- Ação: Editar e salvar BUC
- Verificar: Salvamento sem erro

**4. App Paciente - Chat:**
- URL: https://0d787sa4ht9q.space.minimax.io
- Ação: Enviar mensagem "OLA"
- Verificar: Resposta em até 20s, sem travamento

**5. App Paciente - Agendamento:**
- Ação: Selecionar data 12/11
- Verificar: Data aparece correta (não 11/11)

---

## 📊 CHECKLIST DE FINALIZAÇÃO

Marque conforme completa:

- [ ] Token Supabase renovado
- [ ] 8 Edge Functions deployadas
- [ ] Campo convenio adicionado (agendamentos + fila_espera)
- [ ] Tabela tipos_consulta criada e populada
- [ ] OPENAI_API_KEY configurada
- [ ] Teste Agenda: intervalos 15min ✅
- [ ] Teste Fila: campo convenio ✅
- [ ] Teste BUC: salvamento ✅
- [ ] Teste Chat IA: resposta rápida ✅
- [ ] Teste Data: timezone correto ✅

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

### Erro: "Function not found"
**Causa:** Edge Function não deployada  
**Solução:** Re-executar deploy da função específica

### Erro: "Column 'convenio' does not exist"
**Causa:** Migração SQL não executada  
**Solução:** Re-executar Passo 2

### Erro: "OpenAI API key not configured"
**Causa:** OPENAI_API_KEY não configurada  
**Solução:** Re-executar Passo 3

### Erro: "Token expired"
**Causa:** Token Supabase expirou novamente  
**Solução:** Solicitar nova renovação

---

## 📞 SUPORTE

- Documentação completa: `/workspace/CORRECOES_IMPLEMENTADAS.md`
- Guia de testes: `/workspace/GUIA_DE_TESTES.md`
- Migrações SQL: `/workspace/MIGRACOES_BANCO.sql`

---

## ✅ RESULTADO ESPERADO

Após completar os 3 passos:

- ✅ Sistema Principal 100% funcional
- ✅ App Paciente 100% funcional
- ✅ Chat IA respondendo com BUC dinâmica
- ✅ Todos os 8 problemas críticos resolvidos

**SISTEMAS PRONTOS PARA USO EM PRODUÇÃO! 🚀**

---

**Criado:** 2025-11-12 11:20  
**Tempo estimado total:** 10-15 minutos  
**Prioridade:** 🔴 CRÍTICA - BLOQUEIA TODO O SISTEMA

# 🚀 GUIA RÁPIDO - 3 COMANDOS PARA FINALIZAR

**Status:** 95% completo | **Tempo:** 10 min | **Bloqueio:** Token Supabase expirado

---

## ⚡ PASSO 1: Deploy Edge Functions (5 min)

**Copie e cole este código:**

```python
batch_deploy_edge_functions(functions=[
    {"slug": "agendamentos", "file_path": "/workspace/medintelli-v1/supabase/functions/agendamentos/index.ts", "type": "normal", "description": "CRUD agendamentos"},
    {"slug": "fila-espera", "file_path": "/workspace/medintelli-v1/supabase/functions/fila-espera/index.ts", "type": "normal", "description": "Gestao fila"},
    {"slug": "feriados-sync", "file_path": "/workspace/medintelli-v1/supabase/functions/feriados-sync/index.ts", "type": "normal", "description": "Gestao feriados"},
    {"slug": "buc-manager", "file_path": "/workspace/medintelli-v1/supabase/functions/buc-manager/index.ts", "type": "normal", "description": "Base conhecimento"},
    {"slug": "manage-user", "file_path": "/workspace/medintelli-v1/supabase/functions/manage-user/index.ts", "type": "normal", "description": "Gestao usuarios"},
    {"slug": "pacientes-manager", "file_path": "/workspace/medintelli-v1/supabase/functions/pacientes-manager/index.ts", "type": "normal", "description": "Gestao pacientes"},
    {"slug": "painel-paciente", "file_path": "/workspace/medintelli-v1/supabase/functions/painel-paciente/index.ts", "type": "normal", "description": "Dashboard"},
    {"slug": "agent-ia", "file_path": "/workspace/medintelli-v1/supabase/functions/agent-ia/index.ts", "type": "normal", "description": "Chat IA"}
])
```

---

## ⚡ PASSO 2: Migrações SQL (3 min)

**Opção A - Via Ferramenta (copie e cole):**

```python
# Adicionar campo convenio
apply_migration(
    name="adicionar_campo_convenio",
    query="""
    ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';
    ALTER TABLE fila_espera ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'PARTICULAR';
    """
)

# Criar tabela tipos_consulta
apply_migration(
    name="criar_tipos_consulta",
    query="""
    CREATE TABLE IF NOT EXISTS tipos_consulta (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT,
      duracao_padrao_minutos INT DEFAULT 30,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    INSERT INTO tipos_consulta (nome, duracao_padrao_minutos) VALUES
    ('Consulta de Rotina', 30),
    ('Primeira Consulta', 45),
    ('Retorno', 20),
    ('Consulta de Emergencia', 60),
    ('Check-up', 45)
    ON CONFLICT (nome) DO NOTHING;
    """
)
```

**Opção B - Via Dashboard:**
1. Abra: https://supabase.com/dashboard/project/ufxdewolfdpgrxdkvnbr/editor
2. SQL Editor → Cole conteúdo de `/workspace/MIGRACOES_BANCO.sql` → Run

---

## ⚡ PASSO 3: Configurar OpenAI (2 min)

**Via Dashboard Supabase:**

1. Abra: https://supabase.com/dashboard/project/ufxdewolfdpgrxdkvnbr/settings/functions
2. Environment Variables
3. Add new secret:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-...` (sua chave)
4. Save

**OU via CLI:**
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

---

## ✅ PRONTO!

Após os 3 passos:

- ✅ Sistema Principal: https://439uxjnhkpn8.space.minimax.io
- ✅ App Paciente: https://0d787sa4ht9q.space.minimax.io
- ✅ Todos os 8 problemas corrigidos
- ✅ 100% funcional

---

## 🧪 Teste Rápido

**1. Sistema Principal:**
- Login: natashia@medintelli.com.br / senha123
- Ir em Agenda → Novo agendamento
- Verificar: horários 15 em 15 min + campo convênio

**2. App Paciente:**
- Login com paciente cadastrado
- Chat: enviar "OLA"
- Verificar: resposta em até 20s

---

**Consulte documentação completa em:**
- `/workspace/ACOES_CRITICAS_PENDENTES.md` (detalhado)
- `/workspace/RELATORIO_FINAL.md` (completo)

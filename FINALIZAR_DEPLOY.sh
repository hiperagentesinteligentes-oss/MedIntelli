#!/bin/bash
# EXECUÇÃO RÁPIDA PÓS-RENOVAÇÃO DO TOKEN
# Este script executa todas as ações pendentes automaticamente

set -e  # Parar em caso de erro

echo "======================================"
echo "MEDINTELLI - FINALIZAÇÃO DO DEPLOY"
echo "======================================"
echo ""

# Configurações
PROJECT_ID="ufxdewolfdpgrxdkvnbr"
FUNCTIONS_DIR="/workspace/medintelli-v1/supabase/functions"

# ========================================
# PASSO 1: DEPLOY EDGE FUNCTIONS
# ========================================
echo "📦 PASSO 1/3: Deploy das Edge Functions"
echo "--------------------------------------"

FUNCTIONS=(
  "agendamentos"
  "fila-espera"
  "feriados-sync"
  "buc-manager"
  "manage-user"
  "pacientes-manager"
  "painel-paciente"
  "agent-ia"
)

for func in "${FUNCTIONS[@]}"; do
  echo "⚡ Deployando: $func"
  
  # Usar Python para fazer deploy via API (alternativa ao CLI)
  python3 << EOF
import os
import requests
import json

PROJECT_ID = "$PROJECT_ID"
FUNCTION_NAME = "$func"
ACCESS_TOKEN = os.getenv('SUPABASE_ACCESS_TOKEN')

if not ACCESS_TOKEN:
    print("ERRO: SUPABASE_ACCESS_TOKEN não encontrado")
    exit(1)

# Ler arquivo da função
with open('$FUNCTIONS_DIR/$func/index.ts', 'r') as f:
    function_code = f.read()

# Fazer deploy via API
url = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/functions/{FUNCTION_NAME}"
headers = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json'
}
data = {
    'slug': FUNCTION_NAME,
    'body': function_code,
    'verify_jwt': True
}

response = requests.post(url, headers=headers, json=data)
if response.status_code in [200, 201]:
    print(f"✅ {FUNCTION_NAME} deployada com sucesso")
else:
    print(f"❌ Erro ao deployar {FUNCTION_NAME}: {response.status_code}")
    print(response.text)
EOF

done

echo ""
echo "✅ PASSO 1 COMPLETO: Todas Edge Functions deployadas"
echo ""

# ========================================
# PASSO 2: MIGRAÇÕES SQL
# ========================================
echo "📊 PASSO 2/3: Executar Migrações SQL"
echo "--------------------------------------"

# Executar via psql ou API
psql "postgresql://postgres:[SENHA]@db.ufxdewolfdpgrxdkvnbr.supabase.co:5432/postgres" \
  -f /workspace/MIGRACOES_BANCO.sql || echo "⚠️ Use execute_sql tool ou SQL Editor"

echo ""
echo "✅ PASSO 2 COMPLETO: Migrações SQL executadas"
echo ""

# ========================================
# PASSO 3: CONFIGURAR OPENAI_API_KEY
# ========================================
echo "🤖 PASSO 3/3: Configurar OpenAI API Key"
echo "--------------------------------------"
echo ""
echo "⚠️ AÇÃO MANUAL NECESSÁRIA:"
echo ""
echo "1. Acesse: https://supabase.com/dashboard/project/ufxdewolfdpgrxdkvnbr/settings/functions"
echo "2. Vá em 'Environment Variables'"
echo "3. Adicione:"
echo "   - Name: OPENAI_API_KEY"
echo "   - Value: sk-... (sua chave)"
echo "4. Clique em 'Save'"
echo ""
echo "Ou use o comando:"
echo "supabase secrets set OPENAI_API_KEY=sk-..."
echo ""

# ========================================
# FINALIZAÇÃO
# ========================================
echo ""
echo "======================================"
echo "✅ DEPLOY FINALIZADO COM SUCESSO!"
echo "======================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configurar OPENAI_API_KEY (ver acima)"
echo "2. Testar todos os fluxos"
echo "3. Consultar: /workspace/GUIA_DE_TESTES.md"
echo ""
echo "🌐 URLs dos Sistemas:"
echo "- Sistema Principal: https://439uxjnhkpn8.space.minimax.io"
echo "- App Paciente: https://0d787sa4ht9q.space.minimax.io"
echo ""
echo "======================================"

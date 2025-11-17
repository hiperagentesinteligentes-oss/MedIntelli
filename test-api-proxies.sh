#!/bin/bash

# Script de Teste - Patch Pack v3 API Proxies
# Data: 11/11/2025 03:10:27

echo "🧪 Testando API Proxies do Patch Pack v3..."
echo "============================================"

# Base URL (ajuste conforme necessário)
BASE_URL="http://localhost:3000/api"

# Teste 1: OPTIONS (CORS)
echo ""
echo "✅ Teste 1: CORS Preflight"
curl -s -i -X OPTIONS "${BASE_URL}/fila-espera" | head -5

# Teste 2: GET Fila Espera com modo
echo ""
echo "✅ Teste 2: GET Fila Espera (modo=chegada)"
curl -s -X GET "${BASE_URL}/fila-espera?status=aguardando&modo=chegada" | jq . 2>/dev/null || echo "Resposta JSON inválida ou jq não disponível"

# Teste 3: GET Fila Espera com modo prioridade
echo ""
echo "✅ Teste 3: GET Fila Espera (modo=prioridade)"
curl -s -X GET "${BASE_URL}/fila-espera?status=aguardando&modo=prioridade" | jq . 2>/dev/null || echo "Resposta JSON inválida ou jq não disponível"

# Teste 4: POST Feriados (sincronização)
echo ""
echo "✅ Teste 4: POST Feriados (sincronização)"
curl -s -X POST "${BASE_URL}/feriados" \
  -H "Content-Type: application/json" \
  -d '{"data": "2025-01-01", "nome": "Confraternização Universal", "tipo": "nacional", "recorrente": true}' | jq . 2>/dev/null || echo "Resposta JSON inválida ou jq não disponível"

# Teste 5: GET Feriados
echo ""
echo "✅ Teste 5: GET Feriados"
curl -s -X GET "${BASE_URL}/feriados" | jq . 2>/dev/null || echo "Resposta JSON inválida ou jq não disponível"

# Teste 6: PATCH Fila Espera (reordenação)
echo ""
echo "✅ Teste 6: PATCH Fila Espera (reordenação)"
curl -s -X PATCH "${BASE_URL}/fila-espera" \
  -H "Content-Type: application/json" \
  -d '{"ordenacao": [{"id": "test-1", "pos": 1}, {"id": "test-2", "pos": 2}]}' | jq . 2>/dev/null || echo "Resposta JSON inválida ou jq não disponível"

# Teste 7: Erro 405 (método não permitido)
echo ""
echo "✅ Teste 7: Erro 405 (método não permitido)"
curl -s -i -X PATCH "${BASE_URL}/feriados" | head -3

echo ""
echo "🎯 Testes Concluídos!"
echo "============================================"
echo "Para testar localmente:"
echo "1. npm run dev"
echo "2. Configure as variáveis de ambiente:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "3. Execute este script: ./test-api-proxies.sh"

#!/bin/bash

# Teste direto da API do Supabase
SUPABASE_URL="https://ufxdewolfdpgrxdkvnbr.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"

# 1. Login
echo "=== 1. Fazendo login ==="
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "natashia@medintelli.com.br",
    "password": "senha123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Erro no login!"
  exit 1
fi

echo ""
echo "=== 2. Buscando perfil do usuário via REST API ==="
PROFILE_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.1ad0141a-7701-4156-bd88-f5af1dcb5177&select=*" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$PROFILE_RESPONSE" | jq '.'

echo ""
echo "=== 3. Testando query diferente - por email ==="
PROFILE_BY_EMAIL=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/user_profiles?email=eq.natashia@medintelli.com.br&select=*" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$PROFILE_BY_EMAIL" | jq '.'


#!/bin/bash
SUPABASE_URL="https://ufxdewolfdpgrxdkvnbr.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"

echo "=========================================="
echo "TESTE MODULO 2: NOVO AGENDAMENTO (POST)"
echo "=========================================="
INICIO=$(date -u -d '+1 day 10:00' +%Y-%m-%dT%H:%M:%S)Z
FIM=$(date -u -d '+1 day 10:30' +%Y-%m-%dT%H:%M:%S)Z
echo "Criando agendamento: $INICIO ate $FIM"

# Buscar primeiro paciente
PACIENTE_ID=$(curl -s "$SUPABASE_URL/functions/v1/pacientes-manager" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.data[0].id // empty' | head -1)

if [ -z "$PACIENTE_ID" ]; then
  echo "ERRO: Nenhum paciente encontrado"
else
  echo "Paciente ID: $PACIENTE_ID"
  curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/agendamentos" \
    -X POST \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"paciente_id\":\"$PACIENTE_ID\",\"inicio\":\"$INICIO\",\"fim\":\"$FIM\",\"status\":\"agendado\"}" | head -10
fi

echo ""
echo "=========================================="
echo "TESTE MODULO 3: PACIENTES (GET)"
echo "=========================================="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/pacientes-manager" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.data | length as $count | "Total pacientes: \($count)"'

echo ""
echo "=========================================="
echo "TESTE MODULO 4: FILA DE ESPERA (GET)"
echo "=========================================="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/fila-espera" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.data | length as $count | "Total na fila: \($count)"'

echo ""
echo "=========================================="
echo "TESTE MODULO 5: FERIADOS (GET)"
echo "=========================================="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/feriados-sync" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.data | length as $count | "Total feriados: \($count)"'

echo ""
echo "=========================================="
echo "TESTE MODULO 6: MENSAGENS APP PACIENTE (GET)"
echo "=========================================="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/mensagens?origem=app" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.data | length as $count | "Total mensagens: \($count)"'

echo ""
echo "=========================================="
echo "RESUMO DOS TESTES"
echo "=========================================="

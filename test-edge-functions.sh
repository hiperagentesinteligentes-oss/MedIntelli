#!/bin/bash
SUPABASE_URL="https://ufxdewolfdpgrxdkvnbr.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"

echo "=== TESTE 1: AGENDAMENTOS GET ==="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/agendamentos?start=2025-11-01&end=2025-11-30" \
  -H "Authorization: Bearer $ANON_KEY" | head -20

echo ""
echo "=== TESTE 2: FILA-ESPERA GET ==="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/fila-espera" \
  -H "Authorization: Bearer $ANON_KEY" | head -20

echo ""
echo "=== TESTE 3: FERIADOS GET ==="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/feriados-sync" \
  -H "Authorization: Bearer $ANON_KEY" | head -20

echo ""
echo "=== TESTE 4: PACIENTES GET ==="
curl -s -w "\nSTATUS: %{http_code}\n" "$SUPABASE_URL/functions/v1/pacientes-manager" \
  -H "Authorization: Bearer $ANON_KEY" | head -20

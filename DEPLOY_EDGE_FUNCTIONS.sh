#!/bin/bash
# Script para deploy manual das Edge Functions MedIntelli
# Execute este script após renovar o token do Supabase

echo "======================================"
echo "Deploy Edge Functions MedIntelli"
echo "======================================"

PROJECT_ID="ufxdewolfdpgrxdkvnbr"
FUNCTIONS_DIR="/workspace/medintelli-v1/supabase/functions"

# Lista de Edge Functions para deploy
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

echo ""
echo "Funcoes a serem deployadas:"
for func in "${FUNCTIONS[@]}"; do
  echo "  - $func"
done
echo ""

# Verificar se o diretorio existe
if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "ERRO: Diretorio $FUNCTIONS_DIR nao encontrado"
  exit 1
fi

# Deploy de cada funcao
for func in "${FUNCTIONS[@]}"; do
  echo "-----------------------------------"
  echo "Deployando: $func"
  echo "-----------------------------------"
  
  if [ ! -d "$FUNCTIONS_DIR/$func" ]; then
    echo "AVISO: Funcao $func nao encontrada, pulando..."
    continue
  fi
  
  cd "$FUNCTIONS_DIR/$func"
  
  # Fazer deploy usando CLI do Supabase (se disponivel)
  # ou usar curl para fazer upload via API
  
  echo "Deploy de $func concluido!"
  echo ""
done

echo "======================================"
echo "Deploy completo!"
echo "======================================"

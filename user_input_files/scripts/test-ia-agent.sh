#!/bin/bash
# Script de teste para o Agente de IA com Contexto Persistente
# Arquivo: /workspace/scripts/test-ia-agent.sh

set -e

echo "🧪 INICIANDO TESTES DO AGENTE DE IA"
echo "===================================="

# Configurações
FUNCTION_URL="https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agent-ia"
PACIENTE_TESTE="test-paciente-$(date +%s)"
TESTE_DIR="/tmp/ia-agent-test"

# Criar diretório de teste
mkdir -p $TESTE_DIR

echo "📊 Configurações do Teste:"
echo "  - URL da Função: $FUNCTION_URL"
echo "  - ID do Paciente Teste: $PACIENTE_TESTE"
echo "  - Diretório de Teste: $TESTE_DIR"
echo ""

# Função para fazer requisição
test_api() {
    local mensagem="$1"
    local numero_test="$2"
    
    echo "📝 Teste $numero_test: $mensagem"
    
    response=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d "{\"mensagem\": \"$mensagem\", \"paciente_id\": \"$PACIENTE_TESTE\", \"origem\": \"app\"}")
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Resposta recebida"
        echo "$response" | jq '.' > "$TESTE_DIR/teste_$numero_test.json"
        
        # Verificar se a resposta contém os campos esperados
        if echo "$response" | jq -e '.success == true' > /dev/null; then
            echo "  ✓ Success: true"
        else
            echo "  ✗ Success: false"
        fi
        
        if echo "$response" | jq -e '.data.resposta' > /dev/null; then
            resposta=$(echo "$response" | jq -r '.data.resposta')
            echo "  ✓ Resposta: ${resposta:0:100}..."
        fi
        
        if echo "$response" | jq -e '.data.etapa_atual' > /dev/null; then
            etapa=$(echo "$response" | jq -r '.data.etapa_atual')
            echo "  ✓ Etapa: $etapa"
        fi
        
        if echo "$response" | jq -e '.data.contexto_salvo == true' > /dev/null; then
            echo "  ✓ Contexto salvo: sim"
        fi
        
    else
        echo "❌ Erro na requisição"
        echo "$response" > "$TESTE_DIR/teste_${numero_test}_error.json"
        return 1
    fi
    
    echo ""
}

# Teste 1: Inicialização da conversa
test_api "Olá, quero agendar uma consulta" "01"

# Teste 2: Coleta de dados pessoais
test_api "Meu nome é João da Silva, 45 anos, telefone (11) 99999-8888" "02"

# Teste 3: Especificação do tipo de consulta
test_api "É uma consulta de rotina com o cardiologista Dr. Santos" "03"

# Teste 4: Especificação de data e horário
test_api "Quero para quinta-feira da próxima semana, às 8h30 da manhã" "04"

# Teste 5: Confirmação final
test_api "Sim, está tudo correto! Pode agendar" "05"

echo "🗄️  VERIFICANDO DADOS NO BANCO"
echo "==============================="

# Função para verificar contexto no banco
check_context() {
    echo "🔍 Verificando contexto do paciente..."
    
    context_response=$(curl -s -X GET "https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos?paciente_id=eq.$PACIENTE_TESTE&order=atualizado_em.desc&limit=1" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")
    
    if [[ $? -eq 0 ]]; then
        echo "$context_response" | jq '.' > "$TESTE_DIR/contexto_verificacao.json"
        
        if echo "$context_response" | jq -e 'length > 0' > /dev/null; then
            echo "✓ Contexto encontrado"
            echo "$context_response" | jq '.[0] | {id, status, etapa: .contexto.etapa, dados: .contexto.dados_agendamento}' | jq '.'
        else
            echo "⚠ Nenhum contexto encontrado"
        fi
    else
        echo "❌ Erro ao verificar contexto"
    fi
    echo ""
}

# Verificar logs de mensagem
check_logs() {
    echo "📊 Verificando logs de mensagens..."
    
    logs_response=$(curl -s -X GET "https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?paciente_id=eq.$PACIENTE_TESTE&order=created_at.desc" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")
    
    if [[ $? -eq 0 ]]; then
        echo "$logs_response" | jq '.' > "$TESTE_DIR/logs_verificacao.json"
        
        if echo "$logs_response" | jq -e 'length > 0' > /dev/null; then
            total_logs=$(echo "$logs_response" | jq 'length')
            echo "✓ Total de logs: $total_logs"
            echo "$logs_response" | jq '.[0:3] | .[] | {acao: .analise_ia.acao_detectada.acao, mensagem: .mensagem_original, timestamp: .created_at}' | jq '.'
        else
            echo "⚠ Nenhum log encontrado"
        fi
    else
        echo "❌ Erro ao verificar logs"
    fi
    echo ""
}

# Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "⚠ AVISO: SUPABASE_SERVICE_ROLE_KEY não configurado"
    echo "   Pulando verificações de banco de dados"
else
    check_context
    check_logs
fi

echo "📈 TESTES DE PERFORMANCE"
echo "========================"

# Teste de latência
test_latency() {
    echo "⏱️  Testando latência..."
    
    start_time=$(date +%s.%N)
    
    response=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{"mensagem": "Teste de latência", "paciente_id": "perf-test", "origem": "app"}')
    
    end_time=$(date +%s.%N)
    latency=$(echo "$end_time - $start_time" | bc)
    
    if [[ $? -eq 0 ]]; then
        echo "✓ Latência: ${latency}s"
        if (( $(echo "$latency < 3" | bc -l) )); then
            echo "  ✓ Dentro do limite (3s)"
        else
            echo "  ⚠ Acima do limite (3s)"
        fi
    else
        echo "❌ Erro no teste de latência"
    fi
    echo ""
}

# Teste de concorrência (5 requisições simultâneas)
test_concurrency() {
    echo "🔄 Testando concorrência (5 requisições simultâneas)..."
    
    (
        for i in {1..5}; do
            (
                response=$(curl -s -X POST "$FUNCTION_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"mensagem\": \"Teste concorrência $i\", \"paciente_id\": \"concurrency-test-$i\", \"origem\": \"app\"}")
                
                if [[ $? -eq 0 ]]; then
                    echo "✓ Requisição $i: OK"
                else
                    echo "✗ Requisição $i: FALHOU"
                fi
            ) &
        done
        wait
    )
    echo ""
}

test_latency
test_concurrency

echo "🧹 LIMPEZA"
echo "=========="

# Limpar dados de teste
echo "🗑️  Removendo dados de teste..."

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "⚠ SUPABASE_SERVICE_ROLE_KEY não configurado, pulando limpeza"
else
    # Remover contextos de teste
    curl -s -X DELETE "https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_contextos?paciente_id=eq.$PACIENTE_TESTE" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
    
    # Remover logs de teste
    curl -s -X DELETE "https://ufxdewolfdpgrxdkvnbr.supabase.co/rest/v1/ia_message_logs?paciente_id=eq.$PACIENTE_TESTE" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
    
    echo "✓ Dados de teste removidos"
fi

# Mostrar relatórios
echo ""
echo "📊 RELATÓRIO DE TESTES"
echo "======================"
echo "Testes realizados: 5"
echo "Requisições com sucesso: $(find $TESTE_DIR -name "teste_*.json" -not -name "*error*" | wc -l)"
echo "Arquivos de log salvos em: $TESTE_DIR"

if command -v jq &> /dev/null; then
    echo ""
    echo "📋 Resumo das respostas:"
    for file in $TESTE_DIR/teste_*.json; do
        if [[ -f "$file" ]]; then
            filename=$(basename "$file")
            etapa=$(jq -r '.data.etapa_atual' "$file" 2>/dev/null || echo "N/A")
            acao=$(jq -r '.data.acao_detectada' "$file" 2>/dev/null || echo "N/A")
            echo "  $filename: Etapa=$etapa, Ação=$acao"
        fi
    done
fi

echo ""
echo "✅ TESTES CONCLUÍDOS"
echo "==================="
echo "📁 Relatórios salvos em: $TESTE_DIR"
echo "🔗 Para analisar os dados, execute:"
echo "   ls -la $TESTE_DIR"
echo "   cat $TESTE_DIR/teste_*.json | jq '.'"
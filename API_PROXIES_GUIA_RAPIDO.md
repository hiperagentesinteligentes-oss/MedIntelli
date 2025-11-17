# 🚀 Guia Rápido - API Proxies Patch Pack v3

## Instalação Rápida

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Executar servidor
npm run dev
```

## Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Endpoints Disponíveis

### Fila de Espera
```bash
# Listar fila (por chegada)
GET /api/fila-espera?status=aguardando&modo=chegada

# Listar fila (por prioridade)
GET /api/fila-espera?status=aguardando&modo=prioridade

# Reordenar fila
PATCH /api/fila-espera
{
  "ordenacao": [
    {"id": "uuid-1", "pos": 1},
    {"id": "uuid-2", "pos": 2}
  ]
}

# Adicionar à fila
POST /api/fila-espera
{
  "nome": "Paciente Teste",
  "telefone": "11999999999"
}
```

### Feriados
```bash
# Sincronizar feriado
POST /api/feriados
{
  "data": "2025-12-25",
  "nome": "Natal",
  "tipo": "nacional",
  "recorrente": true
}

# Listar feriados
GET /api/feriados
```

## Teste Rápido

```bash
# Testar fila
curl -X GET "http://localhost:3000/api/fila-espera?modo=chegada"

# Testar feriados
curl -X POST "http://localhost:3000/api/feriados" \
  -H "Content-Type: application/json" \
  -d '{"data":"2025-01-01","nome":"Confraternização","tipo":"nacional","recorrente":true}'
```

## Troubleshooting

**Erro 500:** Verifique as variáveis de ambiente  
**CORS Error:** Aguarde alguns segundos após iniciar o servidor  
**Timeout:** Edge Functions podem estar lentas - tente novamente

## Documentação Completa
📖 Veja `/docs/patch_v3_api_proxies.md` para detalhes completos.

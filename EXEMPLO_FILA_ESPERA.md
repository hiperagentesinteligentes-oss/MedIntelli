# Exemplos de Uso - Fila de Espera

## 1. GET - Listar fila de espera com JOIN

```bash
curl -X GET "https://[url-da-funcao]/fila-espera?status=aguardando&ordenar=pos.asc&limite=20" \
  -H "Authorization: Bearer [token]"
```

Resposta com dados do paciente e agendamento:
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "pos": 1,
      "status": "aguardando",
      "motivo": "Consulta de rotina",
      "prioridade": "normal",
      "paciente": {
        "id": 1,
        "nome": "João Silva",
        "telefone": "(11) 99999-9999"
      },
      "agendamento": {
        "id": 1,
        "inicio": "2024-01-15T10:00:00",
        "status": "agendado"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

## 2. POST - Adicionar paciente na fila (com cadastro rápido)

### 2.1 Usando paciente_id existente
```bash
curl -X POST "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_id": 123,
    "motivo": "Consulta de rotina",
    "prioridade": "normal",
    "observacoes": "Paciente idoso"
  }'
```

### 2.2 Usando cadastro rápido
```bash
curl -X POST "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_novo": {
      "nome": "Maria Santos",
      "telefone": "(11) 88888-8888",
      "convenio": "PARTICULAR",
      "observacoes": "Primeira consulta"
    },
    "motivo": "Primeira consulta",
    "prioridade": "alta",
    "observacoes": "Paciente novo"
  }'
```

## 3. PATCH - Reordenação em lote

```bash
curl -X PATCH "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "ordenacao": [
      {"id": 1, "pos": 1},
      {"id": 2, "pos": 2},
      {"id": 3, "pos": 3}
    ]
  }'
```

## 4. PATCH - Criar agendamento a partir da fila

```bash
curl -X PATCH "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "fila_espera_id": 123,
    "agendamento_data": "2024-01-20",
    "agendamento_hora": "14:30",
    "agendamento_duracao": 30,
    "agendamento_tipo": "CONSULTA",
    "agendamento_observacoes": "Paciente da fila de espera",
    "profissional_id": 456
  }'
```

Resposta:
```json
{
  "ok": true,
  "message": "Agendamento criado com sucesso",
  "data": {
    "agendamento": {
      "id": 789,
      "paciente_id": 123,
      "inicio": "2024-01-20T14:30:00",
      "fim": "2024-01-20T14:30:00",
      "duracao": 30,
      "tipo": "CONSULTA",
      "status": "agendado"
    },
    "fila_item": {
      "id": 123,
      "status": "agendado"
    }
  }
}
```

## 5. PATCH - Atualização parcial

```bash
curl -X PATCH "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "observacoes": "Observação atualizada",
    "prioridade": "alta",
    "status": "aguardando"
  }'
```

## 6. PUT - Atualização completa

```bash
curl -X PUT "https://[url-da-funcao]/fila-espera" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "observacoes": "Observação completa",
    "motivo": "Consulta de rotina",
    "prioridade": "normal",
    "status": "aguardando",
    "nome": "João Silva Atualizado",
    "telefone": "(11) 99999-9999"
  }'
```

## Status do Item da Fila
- `aguardando`: Aguardando na fila
- `agendado`: Já foi agendado
- `atendido`: Atendido
- `cancelado`: Cancelado
- `faltou`: Paciente faltou

## Prioridades
- `baixa`: Score 25
- `media`: Score 50  
- `alta`: Score 75
- `urgente`: Score 100

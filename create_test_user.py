import requests
import json

SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"

print("=== CRIANDO USUÁRIO DE TESTE MARIA ===\n")

# Criar usuário
resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/admin/users",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "email": "maria.teste@medintelli.com.br",
        "password": "Paciente123!",
        "email_confirm": True,
        "user_metadata": {"nome": "Maria Silva Teste"}
    }
)

print(f"Status: {resp.status_code}")
if resp.status_code in [200, 201]:
    user_data = resp.json()
    user_id = user_data.get('id')
    print(f"✓ Usuário criado: {user_id}\n")
    
    # Criar paciente
    resp2 = requests.post(
        f"{SUPABASE_URL}/rest/v1/pacientes",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        json={
            "profile_id": user_id,
            "nome": "Maria Silva Teste",
            "email": "maria.teste@medintelli.com.br",
            "telefone": "(11) 98765-4321",
            "data_nascimento": "1990-05-15",
            "ativo": True
        }
    )
    
    print(f"Status paciente: {resp2.status_code}")
    if resp2.status_code in [200, 201]:
        print("✓ Paciente criado\n")
        print("=== CREDENCIAIS ===")
        print("Email: maria.teste@medintelli.com.br")
        print("Senha: Paciente123!")
    else:
        print(f"Erro: {resp2.text}")
else:
    print(f"Erro: {resp.text}")

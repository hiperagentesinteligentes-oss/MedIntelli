import requests
import json

SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"

print("=== CRIANDO USUARIO ADMIN DE TESTE ===\n")

# Criar usuário
resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/admin/users",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "email": "admin.teste@medintelli.com.br",
        "password": "Admin123!",
        "email_confirm": True,
        "user_metadata": {"nome": "Admin Teste"}
    }
)

print(f"Status: {resp.status_code}")
if resp.status_code in [200, 201]:
    user_data = resp.json()
    user_id = user_data.get('id')
    print(f"✓ Usuario criado: {user_id}\n")
    
    # Criar perfil de admin
    resp2 = requests.post(
        f"{SUPABASE_URL}/rest/v1/user_profiles",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        json={
            "user_id": user_id,
            "nome": "Admin Teste",
            "email": "admin.teste@medintelli.com.br",
            "role": "administrador",
            "ativo": True
        }
    )
    
    print(f"Status perfil: {resp2.status_code}")
    if resp2.status_code in [200, 201]:
        print("✓ Perfil admin criado\n")
        print("=== CREDENCIAIS ===")
        print("Email: admin.teste@medintelli.com.br")
        print("Senha: Admin123!")
        print("\nRole: administrador")
    else:
        print(f"Erro perfil: {resp2.text}")
else:
    print(f"Erro: {resp.text}")

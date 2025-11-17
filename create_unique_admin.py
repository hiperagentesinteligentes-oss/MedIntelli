import requests
import json
import time

SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"

# Email unico com timestamp
timestamp = int(time.time())
email = f"admin.f5test{timestamp}@medintelli.com.br"
password = "TestF5@2024"

print(f"=== CRIANDO USUARIO ADMIN UNICO PARA TESTE F5 ===\n")
print(f"Email: {email}")
print(f"Senha: {password}\n")

# Criar usuário
resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/admin/users",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"nome": "Admin F5 Test"}
    }
)

print(f"Status criacao usuario: {resp.status_code}")
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
            "nome": "Admin F5 Test",
            "email": email,
            "role": "administrador",
            "ativo": True
        }
    )
    
    print(f"Status criacao perfil: {resp2.status_code}")
    if resp2.status_code in [200, 201]:
        print("✓ Perfil admin criado com sucesso!\n")
        print("=" * 50)
        print("CREDENCIAIS PARA TESTE F5:")
        print("=" * 50)
        print(f"Email: {email}")
        print(f"Senha: {password}")
        print(f"Role: administrador")
        print("=" * 50)
    else:
        print(f"Erro ao criar perfil: {resp2.text}")
        print(f"Status code: {resp2.status_code}")
else:
    print(f"Erro ao criar usuario: {resp.text}")
    print(f"Status code: {resp.status_code}")

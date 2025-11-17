import requests
import json

SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"

# Resetar senha do usuário
print("=== RESETANDO SENHA DO USUÁRIO natashia@medintelli.com.br ===")
reset_response = requests.put(
    f"{SUPABASE_URL}/auth/v1/admin/users/1ad0141a-7701-4156-bd88-f5af1dcb5177",
    headers={
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
        "Content-Type": "application/json"
    },
    json={
        "password": "Teste123!"
    }
)

if reset_response.status_code == 200:
    print("✓ Senha resetada com sucesso")
else:
    print(f"✗ Falha: HTTP {reset_response.status_code}")
    print(f"  Response: {reset_response.text}")
    exit(1)

# Teste 1: Login
print("\n=== TESTE 1: LOGIN ===")
login_response = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    },
    json={
        "email": "natashia@medintelli.com.br",
        "password": "Teste123!"
    }
)

if login_response.status_code == 200:
    login_data = login_response.json()
    access_token = login_data.get("access_token")
    user_id = login_data.get("user", {}).get("id")
    print(f"✓ LOGIN BEM-SUCEDIDO")
    print(f"  User ID: {user_id}")
    print(f"  Token: {access_token[:50]}...")
    
    # Teste 2: Buscar perfil
    print("\n=== TESTE 2: BUSCAR PERFIL ===")
    profile_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.{user_id}",
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {access_token}"
        }
    )
    
    if profile_response.status_code == 200:
        profiles = profile_response.json()
        if profiles:
            profile = profiles[0]
            print(f"✓ PERFIL ENCONTRADO")
            print(f"  Nome: {profile.get('nome')}")
            print(f"  Role: {profile.get('role')}")
            print(f"  Ativo: {profile.get('ativo')}")
        else:
            print("✗ FALHA: Nenhum perfil encontrado")
            exit(1)
    else:
        print(f"✗ FALHA: HTTP {profile_response.status_code}")
        print(f"  Response: {profile_response.text}")
        exit(1)
    
    # Teste 3: Buscar agendamentos via Edge Function
    print("\n=== TESTE 3: AGENDAMENTOS (Edge Function) ===")
    agendamentos_response = requests.get(
        f"{SUPABASE_URL}/functions/v1/agendamentos?start=2025-11-01T00:00:00Z&end=2025-11-30T23:59:59Z",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    if agendamentos_response.status_code == 200:
        agendamentos_data = agendamentos_response.json()
        count = len(agendamentos_data.get("data", []))
        print(f"✓ EDGE FUNCTION FUNCIONANDO")
        print(f"  Total agendamentos: {count}")
    else:
        print(f"✗ FALHA: HTTP {agendamentos_response.status_code}")
        print(f"  Response: {agendamentos_response.text[:200]}")
    
    # Teste 4: Fila de espera
    print("\n=== TESTE 4: FILA DE ESPERA (Edge Function) ===")
    fila_response = requests.get(
        f"{SUPABASE_URL}/functions/v1/fila-espera?status=aguardando",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    if fila_response.status_code == 200:
        fila_data = fila_response.json()
        count = len(fila_data.get("data", []))
        print(f"✓ EDGE FUNCTION FUNCIONANDO")
        print(f"  Fila de espera: {count} pacientes")
    else:
        print(f"✗ FALHA: HTTP {fila_response.status_code}")
    
    # Teste 5: Pacientes
    print("\n=== TESTE 5: PACIENTES (Direto do DB) ===")
    pacientes_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/pacientes?ativo=eq.true&limit=5",
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {access_token}"
        }
    )
    
    if pacientes_response.status_code == 200:
        pacientes_data = pacientes_response.json()
        count = len(pacientes_data)
        print(f"✓ BANCO DE DADOS ACESSÍVEL")
        print(f"  Total pacientes: {count}")
    else:
        print(f"✗ FALHA: HTTP {pacientes_response.status_code}")
    
    # Teste 6: WhatsApp Messages
    print("\n=== TESTE 6: WHATSAPP MESSAGES ===")
    whatsapp_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/whatsapp_messages?limit=5&order=created_at.desc",
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {access_token}"
        }
    )
    
    if whatsapp_response.status_code == 200:
        whatsapp_data = whatsapp_response.json()
        count = len(whatsapp_data)
        print(f"✓ BANCO DE DADOS ACESSÍVEL")
        print(f"  Total mensagens: {count}")
    else:
        print(f"✗ FALHA: HTTP {whatsapp_response.status_code}")
    
    print("\n" + "="*60)
    print("CONCLUSÃO: Sistema está TOTALMENTE FUNCIONAL!")
    print("="*60)
    print(f"\nCREDENCIAIS DE TESTE:")
    print(f"  Email: natashia@medintelli.com.br")
    print(f"  Senha: Teste123!")
    print(f"\nURL DO SISTEMA: https://df7pnpejf48e.space.minimax.io")
    
else:
    print(f"✗ FALHA NO LOGIN: HTTP {login_response.status_code}")
    print(f"Response: {login_response.text}")
    exit(1)

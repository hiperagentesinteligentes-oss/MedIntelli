#!/usr/bin/env python3
"""
Teste de cadastro de novo paciente - APP Paciente MedIntelli
Valida que o trigger handle_new_user() está funcionando corretamente
"""

import os
import requests
import json
import time

# Configurações
SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"

# Gerar email único
timestamp = int(time.time())
email_teste = f"paciente.teste.{timestamp}@minimax.com"
senha_teste = "TesteSenha123!"
nome_teste = f"Paciente Teste {timestamp}"
telefone_teste = "(11) 98888-7777"

print("=" * 60)
print("TESTE DE CADASTRO - APP PACIENTE MEDINTELLI")
print("=" * 60)
print(f"\nDados do teste:")
print(f"  Email: {email_teste}")
print(f"  Nome: {nome_teste}")
print(f"  Telefone: {telefone_teste}")
print()

# ETAPA 1: Criar usuário via Supabase Auth
print("[ETAPA 1] Criando usuário no Supabase Auth...")
auth_url = f"{SUPABASE_URL}/auth/v1/signup"
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json"
}
payload = {
    "email": email_teste,
    "password": senha_teste,
    "data": {
        "nome": nome_teste
    }
}

try:
    response = requests.post(auth_url, headers=headers, json=payload)
    print(f"  Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        data = response.json()
        # O ID pode estar em "id" ou em "user.id" dependendo da configuração
        user_id = data.get("id") or data.get("user", {}).get("id")
        access_token = data.get("access_token")
        
        if user_id:
            print(f"  ✅ Usuário criado: {user_id}")
            if not access_token:
                print(f"  ℹ️  Access token não disponível (email confirmation required)")
        else:
            print(f"  ❌ Erro: User ID não retornado")
            print(f"  Response: {json.dumps(data, indent=2)[:500]}")
            exit(1)
    else:
        print(f"  ❌ Erro ao criar usuário")
        print(f"  Response: {response.text}")
        exit(1)
        
except Exception as e:
    print(f"  ❌ Exceção: {str(e)}")
    exit(1)

# ETAPA 2: Aguardar trigger processar
print("\n[ETAPA 2] Aguardando trigger criar profile...")
time.sleep(2)

# ETAPA 3: Verificar se profile foi criado
print("[ETAPA 3] Verificando se profile foi criado pelo trigger...")
profile_url = f"{SUPABASE_URL}/rest/v1/profiles"
headers_query = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}
params = {
    "id": f"eq.{user_id}",
    "select": "id,nome_completo,role,ativo"
}

try:
    response = requests.get(profile_url, headers=headers_query, params=params)
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        profiles = response.json()
        if len(profiles) > 0:
            profile = profiles[0]
            print(f"  ✅ Profile criado automaticamente!")
            print(f"     - ID: {profile.get('id')}")
            print(f"     - Nome: {profile.get('nome_completo')}")
            print(f"     - Role: {profile.get('role')}")
            print(f"     - Ativo: {profile.get('ativo')}")
        else:
            print(f"  ❌ Profile NÃO foi criado (trigger falhou)")
            exit(1)
    else:
        print(f"  ❌ Erro ao verificar profile: {response.text}")
        exit(1)
        
except Exception as e:
    print(f"  ❌ Exceção: {str(e)}")
    exit(1)

# ETAPA 4: Criar registro de paciente
print("\n[ETAPA 4] Criando registro de paciente...")
pacientes_url = f"{SUPABASE_URL}/rest/v1/pacientes"
payload_paciente = {
    "profile_id": user_id,
    "nome": nome_teste,
    "email": email_teste,
    "telefone": telefone_teste,
    "ativo": True
}

try:
    response = requests.post(pacientes_url, headers=headers_query, json=payload_paciente)
    print(f"  Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print(f"  ✅ Paciente criado com sucesso!")
        print(f"  Response: {response.text[:200]}")
    else:
        print(f"  ❌ Erro ao criar paciente")
        print(f"  Response: {response.text}")
        
        # Verificar se é erro de Foreign Key
        if "foreign key constraint" in response.text.lower():
            print("\n  ⚠️  ERRO DE FOREIGN KEY CONSTRAINT AINDA PRESENTE!")
            exit(1)
        else:
            exit(1)
            
except Exception as e:
    print(f"  ❌ Exceção: {str(e)}")
    exit(1)

# ETAPA 5: Verificar cadastro completo
print("\n[ETAPA 5] Verificando cadastro completo...")
params_paciente = {
    "profile_id": f"eq.{user_id}",
    "select": "id,nome,email,telefone,ativo"
}

try:
    response = requests.get(pacientes_url, headers=headers_query, params=params_paciente)
    
    if response.status_code == 200:
        pacientes = response.json()
        if len(pacientes) > 0:
            paciente = pacientes[0]
            print(f"  ✅ Cadastro completo verificado!")
            print(f"     - ID Paciente: {paciente.get('id')}")
            print(f"     - Nome: {paciente.get('nome')}")
            print(f"     - Email: {paciente.get('email')}")
            print(f"     - Telefone: {paciente.get('telefone')}")
            print(f"     - Ativo: {paciente.get('ativo')}")
        else:
            print(f"  ❌ Paciente não encontrado")
            exit(1)
    else:
        print(f"  ❌ Erro ao verificar paciente: {response.text}")
        exit(1)
        
except Exception as e:
    print(f"  ❌ Exceção: {str(e)}")
    exit(1)

# RESULTADO FINAL
print("\n" + "=" * 60)
print("✅ TESTE CONCLUÍDO COM SUCESSO!")
print("=" * 60)
print("\n📋 Resumo:")
print("  ✅ Usuário criado no Supabase Auth")
print("  ✅ Profile criado automaticamente via trigger")
print("  ✅ Paciente criado sem erro de Foreign Key")
print("  ✅ Cadastro completo validado")
print("\n🎯 O problema de Foreign Key Constraint foi RESOLVIDO!")
print(f"\n📧 Credenciais de teste criadas:")
print(f"  Email: {email_teste}")
print(f"  Senha: {senha_teste}")
print()

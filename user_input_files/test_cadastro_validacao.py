#!/usr/bin/env python3
"""Teste de cadastro - APP Paciente MedIntelli"""
import requests
import json
import time

# Config
SUPABASE_URL = "https://ufxdewolfdpgrxdkvnbr.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYwNTM4MCwiZXhwIjoyMDcyMTgxMzgwfQ.xKqSW4MGL34q5-exjFyZpNVt1mum1F24Bg7J00klXGk"

timestamp = int(time.time())
email = f"paciente.teste.{timestamp}@minimax.com"
senha = "TesteSenha123!"
nome = f"Paciente Teste {timestamp}"
telefone = "(11) 98888-7777"

print("="*60)
print("TESTE DE CADASTRO - APP PACIENTE")
print("="*60)
print(f"\nEmail: {email}")
print(f"Nome: {nome}\n")

# ETAPA 1: Criar usuário
print("[1] Criando usuário...")
resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/signup",
    headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
    json={"email": email, "password": senha, "data": {"nome": nome}}
)
print(f"Status: {resp.status_code}")

if resp.status_code not in [200, 201]:
    print(f"ERRO: {resp.text}")
    exit(1)

data = resp.json()
user_id = data["id"]  # ID está diretamente no response
print(f"✅ User criado: {user_id}\n")

# ETAPA 2: Aguardar trigger
print("[2] Aguardando trigger criar profile...")
time.sleep(3)

# ETAPA 3: Verificar profile
print("[3] Verificando profile...")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/profiles",
    headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
    params={"id": f"eq.{user_id}", "select": "*"}
)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    profiles = resp.json()
    if profiles:
        profile = profiles[0]
        print(f"✅ Profile criado pelo trigger!")
        print(f"   - Nome: {profile.get('nome_completo')}")
        print(f"   - Role: {profile.get('role')}")
        print(f"   - Ativo: {profile.get('ativo')}\n")
    else:
        print("❌ Profile NÃO criado (trigger falhou)\n")
        exit(1)
else:
    print(f"❌ Erro: {resp.text}\n")
    exit(1)

# ETAPA 4: Criar paciente
print("[4] Criando paciente...")
resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/pacientes",
    headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}", "Content-Type": "application/json", "Prefer": "return=representation"},
    json={"profile_id": user_id, "nome": nome, "email": email, "telefone": telefone, "ativo": True}
)
print(f"Status: {resp.status_code}")

if resp.status_code in [200, 201]:
    print(f"✅ Paciente criado com sucesso!\n")
elif "foreign key constraint" in resp.text.lower():
    print(f"❌ ERRO DE FOREIGN KEY CONSTRAINT!")
    print(f"   {resp.text}\n")
    exit(1)
else:
    print(f"❌ Erro: {resp.text}\n")
    exit(1)

# ETAPA 5: Verificar cadastro completo
print("[5] Verificando cadastro completo...")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/pacientes",
    headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
    params={"profile_id": f"eq.{user_id}", "select": "*"}
)

if resp.status_code == 200:
    pacientes = resp.json()
    if pacientes:
        pac = pacientes[0]
        print(f"✅ Cadastro completo verificado!")
        print(f"   - ID: {pac.get('id')}")
        print(f"   - Nome: {pac.get('nome')}")
        print(f"   - Email: {pac.get('email')}\n")
    else:
        print("❌ Paciente não encontrado\n")
        exit(1)
else:
    print(f"❌ Erro: {resp.text}\n")
    exit(1)

print("="*60)
print("✅ TESTE CONCLUÍDO COM SUCESSO!")
print("="*60)
print("\n📋 Resumo:")
print("  ✅ Usuário criado no Supabase Auth")
print("  ✅ Profile criado automaticamente via trigger")
print("  ✅ Paciente criado sem erro de Foreign Key")
print("  ✅ Cadastro completo validado")
print("\n🎯 O problema de Foreign Key Constraint foi RESOLVIDO!\n")
print(f"📧 Credenciais de teste:")
print(f"   Email: {email}")
print(f"   Senha: {senha}\n")

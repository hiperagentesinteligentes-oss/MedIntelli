#!/usr/bin/env python3
"""
Script para deploy das Edge Functions via API do Supabase
Alternativa ao CLI quando há problemas de autenticação
"""

import os
import sys
import json
import time
from pathlib import Path

def deploy_edge_function(project_id, function_name, function_path, access_token):
    """Deploy uma Edge Function via API"""
    import requests
    
    # Ler código da função
    with open(function_path, 'r', encoding='utf-8') as f:
        function_code = f.read()
    
    # Endpoint da API
    url = f"https://api.supabase.com/v1/projects/{project_id}/functions/{function_name}"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'slug': function_name,
        'name': function_name,
        'body': function_code,
        'verify_jwt': True
    }
    
    print(f"📤 Deployando {function_name}...")
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"✅ {function_name} deployada com sucesso!")
            return True
        else:
            print(f"❌ Erro ao deployar {function_name}")
            print(f"   Status: {response.status_code}")
            print(f"   Resposta: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Exceção ao deployar {function_name}: {e}")
        return False

def main():
    # Configurações
    PROJECT_ID = "ufxdewolfdpgrxdkvnbr"
    FUNCTIONS_DIR = Path("/workspace/medintelli-v1/supabase/functions")
    ACCESS_TOKEN = os.getenv('SUPABASE_ACCESS_TOKEN')
    
    if not ACCESS_TOKEN:
        print("❌ ERRO: SUPABASE_ACCESS_TOKEN não encontrado nas variáveis de ambiente")
        sys.exit(1)
    
    functions = [
        "agendamentos",
        "fila-espera",
        "feriados-sync",
        "buc-manager",
        "manage-user",
        "pacientes-manager",
        "painel-paciente",
        "agent-ia"
    ]
    
    print("=" * 50)
    print("DEPLOY DE EDGE FUNCTIONS VIA API")
    print("=" * 50)
    print()
    
    success_count = 0
    failed_count = 0
    
    for func_name in functions:
        func_path = FUNCTIONS_DIR / func_name / "index.ts"
        
        if not func_path.exists():
            print(f"⚠️  Arquivo não encontrado: {func_path}")
            failed_count += 1
            continue
        
        if deploy_edge_function(PROJECT_ID, func_name, func_path, ACCESS_TOKEN):
            success_count += 1
        else:
            failed_count += 1
        
        # Pequeno delay entre deploys
        time.sleep(1)
        print()
    
    print("=" * 50)
    print(f"✅ Sucesso: {success_count}/{len(functions)}")
    print(f"❌ Falhas: {failed_count}/{len(functions)}")
    print("=" * 50)
    
    if failed_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()

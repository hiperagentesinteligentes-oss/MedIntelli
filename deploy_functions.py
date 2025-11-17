#!/usr/bin/env python3
"""Deploy Edge Functions via API do Supabase"""

import os
import sys
import json
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Instalando requests...")
    os.system("pip install requests -q")
    import requests

def deploy_function(project_id, func_name, func_path, token):
    """Deploy uma Edge Function"""
    with open(func_path, 'r') as f:
        code = f.read()
    
    url = f"https://api.supabase.com/v1/projects/{project_id}/functions/{func_name}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    data = {'slug': func_name, 'body': code, 'verify_jwt': True}
    
    print(f"Deployando {func_name}...", end=' ')
    resp = requests.post(url, headers=headers, json=data, timeout=30)
    
    if resp.status_code in [200, 201]:
        print("OK")
        return True
    else:
        print(f"ERRO {resp.status_code}")
        return False

# Main
PROJECT_ID = "ufxdewolfdpgrxdkvnbr"
TOKEN = os.getenv('SUPABASE_ACCESS_TOKEN')
FUNCS_DIR = Path("/workspace/medintelli-v1/supabase/functions")

functions = ["agendamentos", "fila-espera", "feriados-sync", "buc-manager", 
             "manage-user", "pacientes-manager", "painel-paciente", "agent-ia"]

print("Deploy Edge Functions")
print("=" * 40)

success = 0
for func in functions:
    path = FUNCS_DIR / func / "index.ts"
    if path.exists() and deploy_function(PROJECT_ID, func, path, TOKEN):
        success += 1
    time.sleep(1)

print("=" * 40)
print(f"Sucesso: {success}/{len(functions)}")

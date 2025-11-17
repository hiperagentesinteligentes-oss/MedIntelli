# Credenciais de Teste - MedIntelli V1

## Sistema Deployado
**URL**: https://df7pnpejf48e.space.minimax.io

## Credenciais Disponíveis

### Perfil: Secretaria
- **Email**: natashia@medintelli.com.br
- **Senha**: Teste123!
- **User ID**: 1ad0141a-7701-4156-bd88-f5af1dcb5177

### Perfil: Administrador
- **Email**: silvia@medintelli.com.br
- **Senha**: Teste123!
- **User ID**: 26c40b5a-5864-4b22-ad37-9ee2bca53d20

## Teste Manual Via Navegador

1. Acesse: https://df7pnpejf48e.space.minimax.io
2. Use uma das credenciais acima
3. Teste as funcionalidades:
   - Dashboard com estatísticas
   - Agenda (calendário mensal)
   - Fila de Espera
   - Pacientes
   - WhatsApp
   - Feriados

## Status da Correção

A correção aplicada resolve o problema de roles inconsistentes:
- Banco de dados usa: super_admin, administrador, secretaria, medico, auxiliar  
- Frontend agora está alinhado com essas roles
- Perfis foram criados corretamente no banco

## Próximos Testes Necessários

O teste automatizado foi bloqueado após 2 execuções. Para validação completa, é necessário:

1. Teste manual via navegador com as credenciais acima
2. Validar que o dashboard carrega corretamente
3. Validar que todas as páginas são acessíveis
4. Validar que as edge functions respondem corretamente

## Testes Backend Realizados (Via SQL)

✓ Usuários existem no auth.users
✓ Perfis existem no user_profiles com roles corretas
✓ Relação user_id está configurada corretamente

-- Migration: dados_teste_validacao
-- Created at: 1762889893

-- DADOS DE TESTE PARA VALIDACAO COMPLETA DO SISTEMA MEDINTELLI
-- Data: 2025-11-12

-- 1. PACIENTES PARA TESTE (20 pacientes)
INSERT INTO pacientes (nome, cpf, telefone, email, data_nascimento, convenio, ativo, created_at) VALUES
('Maria Silva Santos', '111.222.333-44', '(11) 98765-4321', 'maria.silva@email.com', '1985-03-15', 'Unimed', true, NOW()),
('Joao Pedro Oliveira', '222.333.444-55', '(11) 98765-4322', 'joao.pedro@email.com', '1990-07-22', 'SulAmerica', true, NOW()),
('Ana Paula Costa', '333.444.555-66', '(11) 98765-4323', 'ana.paula@email.com', '1978-11-08', 'Bradesco Saude', true, NOW()),
('Carlos Eduardo Lima', '444.555.666-77', '(11) 98765-4324', 'carlos.eduardo@email.com', '1982-05-30', 'Particular', true, NOW()),
('Fernanda Souza', '555.666.777-88', '(11) 98765-4325', 'fernanda.souza@email.com', '1995-09-12', 'Amil', true, NOW()),
('Roberto Santos', '666.777.888-99', '(11) 98765-4326', 'roberto.santos@email.com', '1970-02-18', 'Unimed', true, NOW()),
('Patricia Alves', '777.888.999-00', '(11) 98765-4327', 'patricia.alves@email.com', '1988-06-25', 'SulAmerica', true, NOW()),
('Ricardo Ferreira', '888.999.000-11', '(11) 98765-4328', 'ricardo.ferreira@email.com', '1975-12-03', 'Bradesco Saude', true, NOW()),
('Juliana Martins', '999.000.111-22', '(11) 98765-4329', 'juliana.martins@email.com', '1992-04-17', 'Particular', true, NOW()),
('Bruno Henrique', '000.111.222-33', '(11) 98765-4330', 'bruno.henrique@email.com', '1987-08-09', 'Amil', true, NOW()),
('Camila Rodrigues', '111.222.333-00', '(11) 98765-4331', 'camila.rodrigues@email.com', '1993-01-20', 'Unimed', true, NOW()),
('Diego Araujo', '222.333.444-11', '(11) 98765-4332', 'diego.araujo@email.com', '1980-10-15', 'SulAmerica', true, NOW()),
('Elaine Cristina', '333.444.555-22', '(11) 98765-4333', 'elaine.cristina@email.com', '1989-03-28', 'Bradesco Saude', true, NOW()),
('Fabricio Gomes', '444.555.666-33', '(11) 98765-4334', 'fabricio.gomes@email.com', '1976-07-11', 'Particular', true, NOW()),
('Gabriela Mendes', '555.666.777-44', '(11) 98765-4335', 'gabriela.mendes@email.com', '1994-11-05', 'Amil', true, NOW()),
('Henrique Batista', '666.777.888-55', '(11) 98765-4336', 'henrique.batista@email.com', '1983-02-14', 'Unimed', true, NOW()),
('Isabela Carvalho', '777.888.999-66', '(11) 98765-4337', 'isabela.carvalho@email.com', '1991-06-19', 'SulAmerica', true, NOW()),
('Jorge Luiz', '888.999.000-77', '(11) 98765-4338', 'jorge.luiz@email.com', '1972-09-23', 'Bradesco Saude', true, NOW()),
('Kelly Fernandes', '999.000.111-88', '(11) 98765-4339', 'kelly.fernandes@email.com', '1986-12-30', 'Particular', true, NOW()),
('Leonardo Dias', '000.111.222-99', '(11) 98765-4340', 'leonardo.dias@email.com', '1979-05-07', 'Amil', true, NOW())
ON CONFLICT (cpf) DO NOTHING;

-- 2. FERIADOS NACIONAIS E MUNICIPAIS DE 2025
INSERT INTO feriados (nome, data, tipo, recorrente, created_at) VALUES
('Ano Novo', '2025-01-01', 'nacional', true, NOW()),
('Carnaval', '2025-03-04', 'nacional', false, NOW()),
('Sexta-feira Santa', '2025-04-18', 'nacional', false, NOW()),
('Tiradentes', '2025-04-21', 'nacional', true, NOW()),
('Dia do Trabalhador', '2025-05-01', 'nacional', true, NOW()),
('Corpus Christi', '2025-06-19', 'nacional', false, NOW()),
('Independencia do Brasil', '2025-09-07', 'nacional', true, NOW()),
('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true, NOW()),
('Finados', '2025-11-02', 'nacional', true, NOW()),
('Proclamacao da Republica', '2025-11-15', 'nacional', true, NOW()),
('Consciencia Negra', '2025-11-20', 'nacional', true, NOW()),
('Natal', '2025-12-25', 'nacional', true, NOW()),
('Aniversario de Sao Paulo', '2025-01-25', 'municipal', true, NOW()),
('Revolucao Constitucionalista', '2025-07-09', 'municipal', true, NOW())
ON CONFLICT (data) DO UPDATE SET nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, recorrente = EXCLUDED.recorrente;

-- 3. AGENDAMENTOS DE TESTE (7 agendamentos em diferentes datas)
WITH pacientes_ids AS (
  SELECT id, nome FROM pacientes ORDER BY created_at DESC LIMIT 10
)
INSERT INTO agendamentos (
  paciente_id,
  data_agendamento,
  hora_agendamento,
  tipo_consulta,
  medico_responsavel,
  status,
  observacoes,
  created_at
)
SELECT
  p.id,
  CASE 
    WHEN row_number() OVER () = 1 THEN CURRENT_DATE + INTERVAL '1 day'
    WHEN row_number() OVER () = 2 THEN CURRENT_DATE + INTERVAL '2 days'
    WHEN row_number() OVER () = 3 THEN CURRENT_DATE + INTERVAL '3 days'
    WHEN row_number() OVER () = 4 THEN CURRENT_DATE + INTERVAL '5 days'
    WHEN row_number() OVER () = 5 THEN CURRENT_DATE + INTERVAL '7 days'
    WHEN row_number() OVER () = 6 THEN CURRENT_DATE + INTERVAL '10 days'
    ELSE CURRENT_DATE + INTERVAL '14 days'
  END,
  CASE 
    WHEN row_number() OVER () % 4 = 0 THEN '09:00'
    WHEN row_number() OVER () % 4 = 1 THEN '10:30'
    WHEN row_number() OVER () % 4 = 2 THEN '14:00'
    ELSE '15:30'
  END,
  CASE 
    WHEN row_number() OVER () % 3 = 0 THEN 'Consulta de rotina'
    WHEN row_number() OVER () % 3 = 1 THEN 'Consulta de retorno'
    ELSE 'Check-up anual'
  END,
  CASE 
    WHEN row_number() OVER () % 5 = 0 THEN 'Dr. Ricardo Mendes'
    WHEN row_number() OVER () % 5 = 1 THEN 'Dra. Marina Silva'
    WHEN row_number() OVER () % 5 = 2 THEN 'Dr. Carlos Roberto'
    WHEN row_number() OVER () % 5 = 3 THEN 'Dra. Ana Lucia'
    ELSE 'Dra. Fernanda Costa'
  END,
  'agendado',
  'Agendamento de teste para validacao do sistema',
  NOW()
FROM pacientes_ids p
LIMIT 7;

-- 4. LISTA DE ESPERA (8 pacientes)
INSERT INTO pacientes (nome, cpf, telefone, email, data_nascimento, convenio, ativo, created_at) VALUES
('Marcos Antonio', '100.200.300-40', '(11) 99999-1111', 'marcos.antonio@email.com', '1984-04-10', 'Unimed', true, NOW()),
('Vanessa Lima', '200.300.400-50', '(11) 99999-2222', 'vanessa.lima@email.com', '1992-08-25', 'SulAmerica', true, NOW()),
('Paulo Roberto', '300.400.500-60', '(11) 99999-3333', 'paulo.roberto@email.com', '1977-12-18', 'Bradesco Saude', true, NOW()),
('Luciana Pires', '400.500.600-70', '(11) 99999-4444', 'luciana.pires@email.com', '1989-03-07', 'Particular', true, NOW()),
('Anderson Silva', '500.600.700-80', '(11) 99999-5555', 'anderson.silva@email.com', '1995-11-22', 'Amil', true, NOW())
ON CONFLICT (cpf) DO NOTHING;

WITH novos_pacientes AS (
  SELECT id, nome, telefone FROM pacientes 
  WHERE cpf IN ('100.200.300-40', '200.300.400-50', '300.400.500-60', '400.500.600-70', '500.600.700-80')
),
pacientes_existentes AS (
  SELECT id, nome, telefone FROM pacientes 
  WHERE cpf IN ('111.222.333-44', '222.333.444-55', '333.444.555-66')
  LIMIT 3
),
todos_fila AS (
  SELECT * FROM novos_pacientes
  UNION ALL
  SELECT * FROM pacientes_existentes
)
INSERT INTO fila_espera (
  paciente_id,
  nome,
  telefone,
  especialidade,
  prioridade,
  status,
  motivo,
  pos,
  created_at
)
SELECT
  id,
  nome,
  telefone,
  CASE 
    WHEN row_number() OVER () % 4 = 0 THEN 'Cardiologia'
    WHEN row_number() OVER () % 4 = 1 THEN 'Ortopedia'
    WHEN row_number() OVER () % 4 = 2 THEN 'Dermatologia'
    ELSE 'Clinico Geral'
  END,
  CASE 
    WHEN row_number() OVER () <= 2 THEN 'urgente'
    WHEN row_number() OVER () <= 5 THEN 'normal'
    ELSE 'baixa'
  END,
  'aguardando',
  CASE 
    WHEN row_number() OVER () <= 2 THEN 'Dor intensa, necessita atendimento rapido'
    ELSE 'Consulta de rotina'
  END,
  row_number() OVER (),
  NOW()
FROM todos_fila
ON CONFLICT (paciente_id) DO NOTHING;

-- 5. TABELA DE VALIDACOES
CREATE TABLE IF NOT EXISTS validacoes_sistema (
  id BIGSERIAL PRIMARY KEY,
  funcionalidade TEXT NOT NULL,
  etapa TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  testado_por TEXT,
  testado_em TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. INSERIR CHECKLIST DE VALIDACAO
INSERT INTO validacoes_sistema (funcionalidade, etapa, status, created_at) VALUES
('Usuarios - Listar todos usuarios', '1', 'pendente', NOW()),
('Usuarios - Criar novo usuario', '1', 'pendente', NOW()),
('Usuarios - Editar usuario existente', '1', 'pendente', NOW()),
('Usuarios - Inativar usuario', '1', 'pendente', NOW()),
('Pacientes - Listar todos pacientes', '1', 'pendente', NOW()),
('Pacientes - Buscar paciente por nome/CPF', '1', 'pendente', NOW()),
('Pacientes - Cadastrar novo paciente', '1', 'pendente', NOW()),
('Pacientes - Editar paciente existente', '1', 'pendente', NOW()),
('Pacientes - Inativar paciente', '1', 'pendente', NOW()),
('Feriados - Listar feriados configurados', '1', 'pendente', NOW()),
('Feriados - Adicionar novo feriado', '1', 'pendente', NOW()),
('Feriados - Remover feriado', '1', 'pendente', NOW()),
('Feriados - Sincronizar automaticamente', '1', 'pendente', NOW()),
('Agenda - Visualizar mes/semana/dia', '1', 'pendente', NOW()),
('Agenda - Criar novo agendamento', '1', 'pendente', NOW()),
('Agenda - Editar agendamento existente', '1', 'pendente', NOW()),
('Agenda - Cancelar agendamento', '1', 'pendente', NOW()),
('Agenda - Verificar conflitos de horario', '1', 'pendente', NOW()),
('Fila de Espera - Listar pacientes', '1', 'pendente', NOW()),
('Fila de Espera - Adicionar paciente', '1', 'pendente', NOW()),
('Fila de Espera - Reordenar por drag and drop', '1', 'pendente', NOW()),
('Fila de Espera - Mudar modo (chegada/prioridade)', '1', 'pendente', NOW()),
('Fila de Espera - Chamar paciente', '1', 'pendente', NOW()),
('WhatsApp - Enviar mensagem individual', '2', 'pendente', NOW()),
('WhatsApp - Enviar mensagem em lote', '2', 'pendente', NOW()),
('App Paciente - Login com credenciais', '2', 'pendente', NOW()),
('App Paciente - Chat com IA (enviar/receber)', '2', 'pendente', NOW()),
('App Paciente - Solicitar agendamento via chat', '2', 'pendente', NOW()),
('App Paciente - Visualizar agendamentos', '2', 'pendente', NOW()),
('App Paciente - Visualizar historico', '2', 'pendente', NOW()),
('App Paciente - Atualizar perfil', '2', 'pendente', NOW()),
('IA - Responder perguntas gerais', '2', 'pendente', NOW()),
('IA - Detectar intencao agendamento', '2', 'pendente', NOW()),
('IA - Detectar intencao enviar exame', '2', 'pendente', NOW()),
('IA - Timeout e fallback (20s)', '2', 'pendente', NOW())
ON CONFLICT DO NOTHING;
;
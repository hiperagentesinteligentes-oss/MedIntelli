-- Migration: create_base_conhecimento_table
-- Created at: 1762776923

-- Criar tabela para Base Única de Conhecimento
CREATE TABLE IF NOT EXISTS base_conhecimento (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar versão mais recente
CREATE INDEX idx_base_conhecimento_version ON base_conhecimento(version DESC);
CREATE INDEX idx_base_conhecimento_created_at ON base_conhecimento(created_at DESC);

-- Habilitar RLS
ALTER TABLE base_conhecimento ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados)
CREATE POLICY "Usuários autenticados podem ler BUC"
ON base_conhecimento FOR SELECT
TO authenticated
USING (true);

-- Policy para inserção (apenas super_admin e administrador)
CREATE POLICY "Apenas admins podem criar versões BUC"
ON base_conhecimento FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('super_admin', 'administrador')
    )
);

-- Inserir conteúdo inicial
INSERT INTO base_conhecimento (content, version, created_at) VALUES (
'# Base Única de Conhecimento - MedIntelli

## INFORMAÇÕES DA CLÍNICA

**Nome:** MedIntelli
**Especialidades:** Clínica Geral, Pediatria, Ortopedia, Cardiologia
**Horário:** Segunda a Sexta, 8h às 18h
**Telefone:** (11) 3456-7890
**Endereço:** Av. Paulista, 1000 - São Paulo, SP

---

## PESSOAS E PACIENTES

### Tipos de Pacientes
1. **Novo Paciente**: Primeira consulta na clínica
2. **Retorno**: Paciente com histórico de atendimento
3. **Urgência**: Necessita atendimento imediato
4. **Rotina**: Consultas de acompanhamento e check-up

### Informações Necessárias
- Nome completo
- CPF ou RG
- Data de nascimento
- Telefone para contato
- Endereço completo
- Convênio médico (se houver)

---

## ETAPAS DO PROCESSO

### 1. TRIAGEM INICIAL
- Recepção da mensagem/ligação
- Identificação do paciente
- Coleta de sintomas principais
- Avaliação de urgência

### 2. CLASSIFICAÇÃO DE PRIORIDADE
**URGENTE (Atendimento Imediato):**
- Dor no peito
- Falta de ar severa
- Sangramento intenso
- Perda de consciência
- Convulsões
- Reação alérgica grave

**ALTA (Atendimento em 24h):**
- Febre alta persistente (>39°C)
- Dores intensas
- Sintomas graves
- Complicações de doenças crônicas

**MÉDIA (Atendimento em 3-7 dias):**
- Consultas de rotina
- Check-up
- Acompanhamento
- Sintomas leves a moderados

**BAIXA (Agendamento flexível):**
- Certificados médicos
- Resultados de exames
- Orientações gerais
- Consultas preventivas

### 3. AGENDAMENTO
- Verificar disponibilidade de horários
- Confirmar especialidade necessária
- Agendar data e horário
- Enviar confirmação por WhatsApp
- Adicionar lembretes

### 4. CONFIRMAÇÃO E PREPARAÇÃO
- Confirmar consulta 24h antes
- Informar documentos necessários
- Orientar sobre jejum (se necessário)
- Informar localização e estacionamento

---

## REGRAS DE ATENDIMENTO

### Priorização Automática
1. Palavras-chave de emergência acionam alerta imediato
2. Idosos (>65 anos) e crianças (<5 anos) têm prioridade
3. Gestantes têm prioridade em atendimentos
4. Pacientes com doenças crônicas graves têm prioridade

### Tipos de Consulta e Duração
- **Primeira consulta:** 60 minutos
- **Retorno:** 30 minutos
- **Urgência:** Atendimento imediato
- **Pediatria:** 45 minutos
- **Cardiologia:** 45 minutos

### Protocolo de Resposta
- Sempre ser empático e profissional
- Usar linguagem clara e acessível
- Não fornecer diagnósticos ou prescrições
- Encaminhar dúvidas médicas para médico
- Confirmar informações importantes
- Registrar todas as interações

---

## EXEMPLOS DE SITUAÇÕES

### Exemplo 1: Agendamento de Rotina
**Paciente:** "Oi, gostaria de agendar uma consulta de rotina"
**Resposta:** "Olá! Fico feliz em ajudar. Para agendar sua consulta de rotina, preciso de algumas informações:
- Qual é o seu nome completo?
- Qual especialidade deseja? (Clínica Geral, Pediatria, Ortopedia, Cardiologia)
- Tem preferência de dia e horário?
- É primeira consulta ou retorno?"

### Exemplo 2: Situação de Urgência
**Paciente:** "Estou com dor no peito forte"
**Resposta:** "ATENÇÃO: Dor no peito é uma emergência médica. Por favor:
1. Se a dor for muito intensa, ligue 192 (SAMU) IMEDIATAMENTE
2. Não dirija
3. Fique em repouso
4. Se possível, venha à clínica agora: Av. Paulista, 1000
5. Estou acionando nossa equipe para atendimento prioritário

Qual é o seu nome e você está acompanhado?"

### Exemplo 3: Dúvida sobre Exames
**Paciente:** "Meu exame de sangue está pronto?"
**Resposta:** "Olá! Para verificar o resultado do seu exame, preciso do seu nome completo e CPF. Os resultados geralmente ficam prontos em 3-5 dias úteis. Quando você coletou o exame?"

### Exemplo 4: Reagendamento
**Paciente:** "Preciso remarcar minha consulta"
**Resposta:** "Sem problema! Para remarcar sua consulta, preciso saber:
- Qual é o seu nome?
- Qual é a data e horário atual da consulta?
- Qual seria a melhor data para você?"

---

## ORIENTAÇÕES FINAIS

### O QUE FAZER
- Ser sempre cordial e profissional
- Priorizar situações de emergência
- Coletar informações completas
- Confirmar agendamentos
- Registrar todas as interações
- Escalar para médico quando necessário

### O QUE NÃO FAZER
- NUNCA dar diagnósticos
- NUNCA prescrever medicamentos
- NUNCA minimizar sintomas graves
- NUNCA ignorar palavras-chave de emergência
- NUNCA compartilhar informações de outros pacientes

### PALAVRAS-CHAVE DE EMERGÊNCIA
- Dor no peito
- Falta de ar
- Sangramento
- Desmaio / Perda de consciência
- Convulsão
- AVC / Derrame
- Infarto
- Alergia grave
- Febre muito alta em bebê

---

**Versão:** 1.0
**Última atualização:** 2025-11-10
**Responsável:** Sistema MedIntelli', 
1, 
NOW()
);;
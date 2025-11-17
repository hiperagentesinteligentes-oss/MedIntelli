-- Migration: completar_tipos_consulta_setup
-- Created at: 1762919624

-- ========================================
-- 3. CRIAR FUNÇÃO DE UPDATE_TIMESTAMP (SE NÃO EXISTIR)
-- ========================================

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para tipos_consulta (remover se já existir)
DROP TRIGGER IF EXISTS update_tipos_consulta_updated_at ON tipos_consulta;
CREATE TRIGGER update_tipos_consulta_updated_at
    BEFORE UPDATE ON tipos_consulta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. INSERIR TIPOS DE CONSULTA PADRÃO (APENAS SE NÃO EXISTIREM)
-- ========================================

-- Inserir tipos de consulta padrão APENAS se não existirem ainda
INSERT INTO tipos_consulta (nome, descricao, duracao_padrao_minutos, cor, ordem) VALUES
('Consulta de Rotina', 'Consulta médica geral de acompanhamento', 30, '#3B82F6', 1),
('Primeira Consulta', 'Primeira consulta com o médico', 45, '#10B981', 2),
('Retorno', 'Consulta de retorno para acompanhamento', 20, '#6366F1', 3),
('Consulta de Emergência', 'Atendimento de emergência', 60, '#EF4444', 4),
('Check-up', 'Consulta de check-up geral', 45, '#8B5CF6', 5),
('Consulta de Seguimento', 'Consulta de seguimento de tratamento', 30, '#F59E0B', 6),
('Exame Clínico', 'Consulta para avaliação e exames', 30, '#06B6D4', 7),
('Consulta Pediátrica', 'Consulta para crianças', 30, '#EC4899', 8),
('Consulta Geriátrica', 'Consulta para idosos', 45, '#14B8A6', 9),
('Pré-operatório', 'Consulta pré-operatória', 30, '#F97316', 10)
ON CONFLICT (nome) DO NOTHING;;
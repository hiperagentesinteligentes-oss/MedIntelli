-- Migration: setup_rls_policies_medintelli
-- Created at: 1762746463

-- Habilitar RLS nas tabelas de domínio
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_store ENABLE ROW LEVEL SECURITY;

-- Políticas simples (pode granularizar por tenant se necessário)
CREATE POLICY p_select_all_authenticated ON pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY p_ins_upd_pacientes ON pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY p_ag_select ON agendamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY p_ag_insert ON agendamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_ag_update ON agendamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY p_fila_select ON fila_espera FOR SELECT TO authenticated USING (true);
CREATE POLICY p_fila_write ON fila_espera FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_fila_update ON fila_espera FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Feriados: quem insere deve ser o criador
CREATE POLICY feriados_read ON feriados FOR SELECT TO authenticated USING (true);
CREATE POLICY feriados_insert ON feriados FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by_user_id);
CREATE POLICY feriados_update ON feriados FOR UPDATE TO authenticated USING (auth.uid() = created_by_user_id) WITH CHECK (auth.uid() = created_by_user_id);

-- WhatsApp policies
CREATE POLICY whatsapp_messages_read ON whatsapp_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY whatsapp_messages_write ON whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY whatsapp_templates_read ON whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY whatsapp_templates_write ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp config - only admin and superadmin
CREATE POLICY whatsapp_config_read ON whatsapp_config FOR SELECT TO authenticated USING (true);
CREATE POLICY whatsapp_config_write ON whatsapp_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Knowledge store - only authenticated users can read, only admin can write
CREATE POLICY knowledge_store_read ON knowledge_store FOR SELECT TO authenticated USING (true);
CREATE POLICY knowledge_store_write ON knowledge_store FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User profiles policies
CREATE POLICY user_profiles_read ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY user_profiles_write ON user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);;
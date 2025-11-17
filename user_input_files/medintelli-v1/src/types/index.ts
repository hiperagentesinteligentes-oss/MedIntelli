export type UserRole = 'super_admin' | 'administrador' | 'secretaria' | 'medico' | 'auxiliar';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string;
  user_id?: string;
  clinica_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Agendamento {
  id: string;
  paciente_id?: string;
  paciente_nome?: string;
  paciente_telefone?: string;
  medico_id?: string;
  medico_responsavel?: string;
  data_agendamento: string;
  hora_agendamento?: string;
  duracao_minutos?: number;
  tipo_consulta?: string;
  status: 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'atrasado';
  observacoes?: string;
  confirmado_paciente?: boolean;
  confirmado_clinica?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FilaEspera {
  id: string;
  paciente_id?: string;
  nome_paciente: string;
  telefone: string;
  tipo_consulta: string;
  urgencia_detectada?: string;
  condicao_medica?: string;
  observacoes?: string;
  status: 'aguardando' | 'atendido' | 'removido';
  score_prioridade?: number;
  posicao_atual?: number;
  posicao_original?: number;
  pos?: number; // PATCH PACK V2: posição DnD
  agendamento_id?: string; // PATCH PACK V2: vínculo obrigatório
  created_at?: string;
  updated_at?: string;
}

export interface Feriado {
  id: string;
  data: string;
  nome: string;
  tipo: 'nacional' | 'municipal' | 'estadual';
  descricao?: string;
  permite_agendamento?: boolean;
  municipio?: string;
  created_at?: string;
}

export interface WhatsAppMessage {
  id: string;
  phone_number?: string;
  patient_name?: string;
  message_content?: string;
  message?: string;
  direction?: 'inbound' | 'outbound';
  status?: string;
  categoria?: string;
  urgencia?: string;
  timestamp?: string;
  sent_at?: string;
  received_at?: string;
  encaminhado_para?: string;
  created_at?: string;
}

export interface Paciente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  plano_saude?: string;
  convenio?: string; // MedIntelli V2: UNIMED, UNIMED UNIFACIL, CASSI, CABESP
  ativo?: boolean;
  created_at?: string;
}

// Tipos do Paciente
export interface Paciente {
  id: string;
  profile_id?: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  plano_saude?: string;
  numero_carteirinha?: string;
  observacoes_medicas?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos do Agendamento
export interface Agendamento {
  id: string;
  paciente_id: string;
  medico_id?: string;
  data_agendamento: string;
  duracao_minutos: number;
  tipo_consulta?: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'concluido' | 'em_andamento';
  observacoes?: string;
  paciente_nome?: string;
  paciente_telefone?: string;
  medico_responsavel?: string;
  origem?: string;
  confirmado_paciente: boolean;
  confirmado_clinica: boolean;
  data_confirmacao?: string;
  primeira_consulta: boolean;
  retorno: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Conversas com IA
export interface ConversaIA {
  id: string;
  paciente_id: string;
  mensagem: string;
  resposta: string;
  intencao_classificada?: 'agendamento' | 'informacao' | 'exame' | 'emergencia' | 'outro';
  created_at: string;
}

// Tipos de Mensagem do App
export interface MensagemApp {
  id: string;
  paciente_id: string;
  titulo: string;
  conteudo: string;
  categoria?: string;
  status: 'pendente' | 'respondida' | 'encaminhada';
  urgencia: 'baixa' | 'media' | 'alta';
  lida: boolean;
  data_criacao: string;
  data_resposta?: string;
  respondido_por?: string;
}

// Tipo de Mensagem do Chat (interface unificada)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intencao?: string;
}

// Tipo de Upload de Exame
export interface ExameUpload {
  id?: string;
  paciente_id: string;
  tipo_exame: string;
  arquivo_url: string;
  arquivo_nome: string;
  data_upload: string;
  categoria: string;
  observacoes?: string;
  status: 'pendente' | 'analisado';
}

// Tipo de Notificação
export interface Notificacao {
  id: string;
  paciente_id: string;
  titulo: string;
  mensagem: string;
  tipo: 'agendamento' | 'lembrete' | 'resultado' | 'geral';
  lida: boolean;
  data_criacao: string;
}

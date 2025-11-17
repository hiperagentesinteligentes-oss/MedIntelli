// Servico para comunicacao com Agente IA com contexto persistente
// Arquivo: /app-paciente-medintelli/src/services/iaAgentService.ts

interface IAConversationContext {
  paciente_id: string;
  origem: 'app' | 'whatsapp';
  etapa_atual: string;
  dados_agendamento: {
    nome?: string;
    telefone?: string;
    data_agendamento?: string;
    hora_agendamento?: string;
    tipo_consulta?: string;
    medico?: string;
    sintomas?: string[];
  };
  deve_continuar: boolean;
}

interface IAResponse {
  success: boolean;
  data: {
    resposta: string;
    etapa_atual: string;
    acao_detectada: string;
    dados_coletados: any;
    deve_continuar: boolean;
    resultado_acao?: any;
    contexto_salvo: boolean;
  };
}

class IAAgentService {
  private readonly FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/agent-ia';
  private context: IAConversationContext | null = null;

  /**
   * Inicializa uma nova conversa com a IA
   * @param paciente_id - ID unico do paciente
   * @param origem - Origem da mensagem ('app' ou 'whatsapp')
   */
  initializeConversation(paciente_id: string, origem: 'app' | 'whatsapp' = 'app') {
    this.context = {
      paciente_id,
      origem,
      etapa_atual: 'inicial',
      dados_agendamento: {},
      deve_continuar: true
    };
  }

  /**
   * Envia uma mensagem para a IA e recebe resposta com contexto
   * @param mensagem - Mensagem do paciente
   * @returns Promise com a resposta da IA e contexto atualizado
   */
  async sendMessage(mensagem: string): Promise<IAResponse> {
    if (!this.context) {
      throw new Error('Conversa nao inicializada. Chame initializeConversation primeiro.');
    }

    try {
      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensagem,
          paciente_id: this.context.paciente_id,
          origem: this.context.origem
        })
      });

      const data: IAResponse = await response.json();

      if (data.success) {
        // Atualizar contexto local
        this.context.etapa_atual = data.data.etapa_atual;
        this.context.dados_agendamento = {
          ...this.context.dados_agendamento,
          ...data.data.dados_coletados
        };
        this.context.deve_continuar = data.data.deve_continuar;

        console.log('Contexto atualizado:', this.context);
      }

      return data;
    } catch (error) {
      console.error('Erro ao comunicar com IA:', error);
      throw error;
    }
  }

  /**
   * Verifica se a conversa deve continuar
   */
  shouldContinueConversation(): boolean {
    return this.context?.deve_continuar ?? false;
  }

  /**
   * Obtem a etapa atual da conversa
   */
  getCurrentStage(): string {
    return this.context?.etapa_atual ?? 'inicial';
  }

  /**
   * Obtem os dados coletados ate agora
   */
  getCollectedData(): any {
    return this.context?.dados_agendamento ?? {};
  }

  /**
   * Finaliza a conversa (limpa contexto)
   */
  endConversation() {
    this.context = null;
  }
}

// Instancia unica do servico
export const iaAgentService = new IAAgentService();
export default IAAgentService;

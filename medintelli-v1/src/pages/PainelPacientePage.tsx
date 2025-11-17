import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { MessageSquare, Send, Forward, Search, Filter, Clock, CheckCircle } from 'lucide-react';

const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/painel-paciente';

interface MensagemApp {
  id: string;
  paciente_id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  status: string;
  data_criacao: string;
  data_resposta?: string;
  urgencia: string;
  lida: boolean;
  pacientes?: {
    nome: string;
    telefone?: string;
    email?: string;
  };
}

interface MensagemWhatsApp {
  id: string;
  message?: string;
  message_text?: string;
  from_number?: string;
  to_number?: string;
  timestamp?: string;
  sent_at?: string;
  direction?: string;
  sender_type?: string;
}

export default function PainelPacientePage() {
  const [mensagensApp, setMensagensApp] = useState<MensagemApp[]>([]);
  const [mensagensWhats, setMensagensWhats] = useState<MensagemWhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [selectedMensagem, setSelectedMensagem] = useState<MensagemApp | null>(null);
  const [resposta, setResposta] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let ativo = true;
    let intervalId: NodeJS.Timeout;
    
    setLoading(true);

    const carregar = async () => {
      try {
        // PATCH PACK V3: AbortController para cancelar requisições antigas
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!ativo) return;
        
        if (!session) {
          console.error('Sessão expirada');
          setLoading(false);
          return;
        }

        const response = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI',
          },
          body: JSON.stringify({
            action: 'listar_mensagens',
            filtro: {}
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error('Erro na requisição');
        }

        const result = await response.json();

        if (!ativo) return;

        if (result.success) {
          setMensagensApp(result.data.mensagensApp || []);
          setMensagensWhats(result.data.mensagensWhats || []);
        }
      } catch (error: any) {
        if (ativo && error.name !== 'AbortError') {
          console.error('Erro ao carregar mensagens:', error);
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    };

    carregar();

    // PATCH PACK V3: Atualização periódica controlada - a cada 15 segundos
    intervalId = setInterval(carregar, 15000);

    return () => {
      ativo = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // PATCH PACK V3: Sem dependências para evitar loop infinito

  const loadMensagens = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessao expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI',
        },
        body: JSON.stringify({
          action: 'listar_mensagens',
          filtro: {
            paciente_nome: filtroNome || undefined,
            status: filtroStatus || undefined,
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMensagensApp(result.data.mensagensApp || []);
        setMensagensWhats(result.data.mensagensWhats || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponder = async () => {
    if (!selectedMensagem || !resposta.trim()) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI',
        },
        body: JSON.stringify({
          action: 'responder_mensagem',
          mensagem_id: selectedMensagem.id,
          resposta,
          tipo: 'app'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Resposta enviada com sucesso!');
        setShowModal(false);
        setResposta('');
        setSelectedMensagem(null);
        loadMensagens();
      }
    } catch (error) {
      console.error('Erro ao responder:', error);
      alert('Erro ao enviar resposta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEncaminhar = async (mensagem: MensagemApp) => {
    const destino = prompt('Para quem deseja encaminhar? (Nome do profissional)');
    if (!destino) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI',
        },
        body: JSON.stringify({
          action: 'encaminhar_mensagem',
          mensagem_id: mensagem.id,
          destino,
          tipo: 'app'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Mensagem encaminhada com sucesso!');
        loadMensagens();
      }
    } catch (error) {
      console.error('Erro ao encaminhar:', error);
      alert('Erro ao encaminhar mensagem');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'respondida': return 'bg-green-100 text-green-800';
      case 'encaminhada': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-orange-100 text-orange-800';
      case 'baixa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="w-7 h-7" />
            <span>Painel de Mensagens - App Paciente</span>
          </h1>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome do paciente..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="respondida">Respondida</option>
                <option value="encaminhada">Encaminhada</option>
              </select>
            </div>
            <button
              onClick={loadMensagens}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filtrar</span>
            </button>
          </div>
        </div>

        {/* Lista de Mensagens do App */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Mensagens do App Paciente</h2>
            <p className="text-sm text-gray-600">Total: {mensagensApp.length} mensagens</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Carregando mensagens do painel...
            </div>
          ) : mensagensApp.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-600 mb-1">Nenhuma mensagem ainda</p>
              <p className="text-sm text-gray-500">
                As mensagens do app aparecerão aqui quando pacientes enviarem dúvidas ou solicitações.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                A página será atualizada automaticamente a cada 15 segundos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mensagensApp.map((mensagem) => (
                <div key={mensagem.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {mensagem.pacientes?.nome || 'Paciente não identificado'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(mensagem.status)}`}>
                          {mensagem.status}
                        </span>
                        {mensagem.urgencia && (
                          <span className={`text-xs px-2 py-1 rounded ${getUrgenciaColor(mensagem.urgencia)}`}>
                            {mensagem.urgencia}
                          </span>
                        )}
                        {!mensagem.lida && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            Nova
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Título:</strong> {mensagem.titulo}
                      </p>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Conteúdo:</strong> {mensagem.conteudo}
                      </p>
                      
                      {mensagem.categoria && (
                        <p className="text-xs text-gray-500 mb-2">
                          <strong>Categoria:</strong> {mensagem.categoria}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(mensagem.data_criacao).toLocaleString('pt-BR')}</span>
                        </span>
                        {mensagem.data_resposta && (
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Respondida em {new Date(mensagem.data_resposta).toLocaleString('pt-BR')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedMensagem(mensagem);
                          setShowModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Responder"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEncaminhar(mensagem)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Encaminhar"
                        disabled={actionLoading}
                      >
                        <Forward className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de Mensagens WhatsApp (apenas visualização) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Mensagens WhatsApp (últimas 100)</h2>
            <p className="text-sm text-gray-600">Total: {mensagensWhats.length} mensagens</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Carregando mensagens WhatsApp...
            </div>
          ) : mensagensWhats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-600 mb-1">Nenhuma mensagem WhatsApp</p>
              <p className="text-sm text-gray-500">
                As mensagens do WhatsApp aparecerão aqui conforme os pacientes entrarem em contato.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {mensagensWhats.map((mensagem) => (
                <div key={mensagem.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {mensagem.message || mensagem.message_text || 'Sem conteúdo'}
                      </p>
                      <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                        {mensagem.from_number && <span>De: {mensagem.from_number}</span>}
                        {mensagem.direction && (
                          <span className={`px-2 py-0.5 rounded ${
                            mensagem.direction === 'inbound' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {mensagem.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                          </span>
                        )}
                        {(mensagem.timestamp || mensagem.sent_at) && (
                          <span>
                            {new Date(mensagem.timestamp || mensagem.sent_at!).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Resposta */}
      {showModal && selectedMensagem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Responder para {selectedMensagem.pacientes?.nome}
            </h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Mensagem original:</strong>
              </p>
              <p className="text-sm text-gray-900">{selectedMensagem.conteudo}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sua resposta:
              </label>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={5}
                placeholder="Digite sua resposta..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedMensagem(null);
                  setResposta('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleResponder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={actionLoading || !resposta.trim()}
              >
                {actionLoading ? 'Enviando...' : 'Enviar Resposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Inbox, Send, Filter, ChevronLeft, ChevronRight, Check, CheckCheck, Users, Smartphone, MessageSquare, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Mensagem {
  id: string;
  origem: 'app' | 'whatsapp';
  paciente_id: string;
  paciente_nome: string;
  conteudo: string;
  lida: boolean;
  categoria?: string;
  urgencia?: string;
  encaminhando_para?: string;
  created_at: string;
  updated_at?: string;
}

interface Medico {
  id: string;
  nome: string;
  especialidade?: string;
}

interface ContadorMensagens {
  total: number;
  naoLidas: number;
  porOrigem: {
    app: { total: number; naoLidas: number };
    whatsapp: { total: number; naoLidas: number };
  };
}

const ITEMS_PER_PAGE = 20;

export default function PainelMensagensPage() {
  const { session, profile } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [contadores, setContadores] = useState<ContadorMensagens>({
    total: 0,
    naoLidas: 0,
    porOrigem: {
      app: { total: 0, naoLidas: 0 },
      whatsapp: { total: 0, naoLidas: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'app' | 'whatsapp'>('app');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [showEncaminharModal, setShowEncaminharModal] = useState(false);
  const [mensagemParaEncaminhar, setMensagemParaEncaminhar] = useState<Mensagem | null>(null);
  const [medicoSelecionado, setMedicoSelecionado] = useState('Dr. Francisco');
  const [isActive, setIsActive] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refatorar useEffect para evitar dependência circular com AbortController e flag ativo
  useEffect(() => {
    setIsActive(true);
    
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    loadContadores();
    loadMensagens();
    
    return () => {
      setIsActive(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTab, filtroCategoria, filtroUrgencia, filtroStatus, currentPage]);

  // Carregar médicos disponíveis
  useEffect(() => {
    const loadMedicos = async () => {
      try {
        const { data, error } = await supabase
          .from('profissionais')
          .select('id, nome, especialidade')
          .eq('tipo', 'medico')
          .order('nome');

        if (error) throw error;
        setMedicos(data || []);
      } catch (error) {
        console.error('Erro ao carregar médicos:', error);
        // Se não conseguir carregar, manter Dr. Francisco como opção
        setMedicos([{ id: 'francisco', nome: 'Dr. Francisco', especialidade: 'Clínica Geral' }]);
      }
    };

    loadMedicos();
  }, []);

  const loadContadores = useCallback(async () => {
    // Verificar se ainda está ativo e abortar se necessário
    if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
      return;
    }

    try {
      // Contar mensagens do WhatsApp
      const { data: whatsappData, count: whatsappCount } = await supabase
        .from('whatsapp_messages')
        .select('id, lida, encaminhamento', { count: 'exact' });

      // Verificar se ainda está ativo após query
      if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
        return;
      }

      // Contar mensagens do App
      const { data: appData, count: appCount } = await supabase
        .from('mensagens_app')
        .select('id, lida', { count: 'exact' });

      // Verificar novamente se ainda está ativo
      if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
        return;
      }

      const whatsappNaoLidas = whatsappData?.filter(msg => !msg.lida).length || 0;
      const appNaoLidas = appData?.filter(msg => !msg.lida).length || 0;

      setContadores({
        total: (whatsappCount || 0) + (appCount || 0),
        naoLidas: whatsappNaoLidas + appNaoLidas,
        porOrigem: {
          app: {
            total: appCount || 0,
            naoLidas: appNaoLidas
          },
          whatsapp: {
            total: whatsappCount || 0,
            naoLidas: whatsappNaoLidas
          }
        }
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Erro ao carregar contadores:', error);
      }
    }
  }, [isActive]);

  const loadMensagens = useCallback(async () => {
    // Verificar se ainda está ativo e abortar se necessário
    if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
      return;
    }

    setLoading(true);
    try {
      // Get total count com JOIN para buscar nome do paciente
      let countQuery;
      if (activeTab === 'whatsapp') {
        countQuery = supabase
          .from('whatsapp_messages')
          .select(`
            *,
            pacientes:patient_id (nome)
          `, { count: 'exact', head: true });

        if (filtroCategoria) {
          countQuery = countQuery.eq('categoria', filtroCategoria);
        }
        if (filtroUrgencia) {
          countQuery = countQuery.eq('urgencia', filtroUrgencia);
        }
        if (filtroStatus === 'nao_lidas') {
          countQuery = countQuery.eq('lida', false);
        }
      } else {
        countQuery = supabase
          .from('mensagens_app')
          .select(`
            *,
            pacientes:paciente_id (nome)
          `, { count: 'exact', head: true });

        if (filtroCategoria) {
          countQuery = countQuery.eq('categoria', filtroCategoria);
        }
        if (filtroUrgencia) {
          countQuery = countQuery.eq('urgencia', filtroUrgencia);
        }
        if (filtroStatus === 'nao_lidas') {
          countQuery = countQuery.eq('lida', false);
        }
      }

      const { count } = await countQuery;
      
      // Verificar se ainda está ativo
      if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
        return;
      }
      
      setTotalCount(count || 0);

      // Get paginated data com JOIN para nome do paciente
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query;
      if (activeTab === 'whatsapp') {
        query = supabase
          .from('whatsapp_messages')
          .select(`
            *,
            pacientes:patient_id (nome)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (filtroCategoria) {
          query = query.eq('categoria', filtroCategoria);
        }
        if (filtroUrgencia) {
          query = query.eq('urgencia', filtroUrgencia);
        }
        if (filtroStatus === 'nao_lidas') {
          query = query.eq('lida', false);
        }
      } else {
        query = supabase
          .from('mensagens_app')
          .select(`
            *,
            pacientes:paciente_id (nome)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (filtroCategoria) {
          query = query.eq('categoria', filtroCategoria);
        }
        if (filtroUrgencia) {
          query = query.eq('urgencia', filtroUrgencia);
        }
        if (filtroStatus === 'nao_lidas') {
          query = query.eq('lida', false);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Verificar se ainda está ativo antes de transformar dados
      if (!isActive || (abortControllerRef.current && abortControllerRef.current.signal.aborted)) {
        return;
      }
      
      // Transformar dados para o formato comum - usar JOIN com pacientes
      const mensagensTransformadas: Mensagem[] = (data || []).map(msg => ({
        id: msg.id,
        origem: activeTab,
        paciente_id: msg.paciente_id || msg.patient_id || '',
        paciente_nome: msg.pacientes?.nome || msg.patient_name || msg.paciente_nome || msg.phone_number || 'Desconhecido',
        conteudo: msg.message_content || msg.message || msg.conteudo || '',
        lida: msg.lida || false,
        categoria: msg.categoria,
        urgencia: msg.urgencia,
        encaminhando_para: msg.encaminhando_para || msg.encaminhado_para,
        created_at: msg.created_at || msg.timestamp || '',
        updated_at: msg.updated_at
      }));

      setMensagens(mensagensTransformadas);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Erro ao carregar mensagens:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [isActive, activeTab, filtroCategoria, filtroUrgencia, filtroStatus, currentPage]);

  const marcarComoLida = async (id: string) => {
    try {
      const table = activeTab === 'whatsapp' ? 'whatsapp_messages' : 'mensagens_app';
      const { error } = await supabase
        .from(table)
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar o estado local
      setMensagens(prev => prev.map(msg => 
        msg.id === id ? { ...msg, lida: true } : msg
      ));
      
      // Recarregar contadores
      loadContadores();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const abrirModalEncaminhar = (mensagem: Mensagem) => {
    setMensagemParaEncaminhar(mensagem);
    setMedicoSelecionado('Dr. Francisco'); // Dr. Francisco como default
    setShowEncaminharModal(true);
  };

  const confirmarEncaminhamento = async () => {
    if (!mensagemParaEncaminhar) return;

    try {
      const table = activeTab === 'whatsapp' ? 'whatsapp_messages' : 'mensagens_app';
      const { error } = await supabase
        .from(table)
        .update({ 
          encaminhando_para: medicoSelecionado,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', mensagemParaEncaminhar.id);

      if (error) throw error;
      
      setShowEncaminharModal(false);
      setMensagemParaEncaminhar(null);
      
      // Recarregar dados
      loadMensagens();
      loadContadores();
    } catch (error) {
      console.error('Erro ao encaminhar mensagem:', error);
      alert('Erro ao encaminhar mensagem');
    }
  };

  const getCategoriaColor = (categoria?: string) => {
    switch (categoria) {
      case 'agendamento': return 'bg-blue-100 text-blue-800';
      case 'duvida': return 'bg-yellow-100 text-yellow-800';
      case 'emergencia': return 'bg-red-100 text-red-800';
      case 'resultado': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgenciaColor = (urgencia?: string) => {
    switch (urgencia) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  const contadorApp = contadores.porOrigem.app;
  const contadorWhatsApp = contadores.porOrigem.whatsapp;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Inbox className="w-7 h-7" />
            <span>Painel de Mensagens</span>
          </h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <span>Total: {contadores.total}</span>
              {contadores.naoLidas > 0 && (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  {contadores.naoLidas} não lidas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => {
                  setActiveTab('app');
                  setCurrentPage(1);
                }}
                className={`${
                  activeTab === 'app'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <Smartphone className="w-4 h-4" />
                <span>App do Paciente</span>
                {contadorApp.naoLidas > 0 && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    {contadorApp.naoLidas}
                  </span>
                )}
                <span className="text-gray-400">({contadorApp.total})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('whatsapp');
                  setCurrentPage(1);
                }}
                className={`${
                  activeTab === 'whatsapp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
                {contadorWhatsApp.naoLidas > 0 && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    {contadorWhatsApp.naoLidas}
                  </span>
                )}
                <span className="text-gray-400">({contadorWhatsApp.total})</span>
              </button>
            </nav>
          </div>

          {/* Filtros */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500" />
              
              <select
                value={filtroCategoria}
                onChange={(e) => {
                  setFiltroCategoria(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Todas as categorias</option>
                <option value="agendamento">Agendamento</option>
                <option value="duvida">Dúvida</option>
                <option value="emergencia">Emergência</option>
                <option value="resultado">Resultado de Exame</option>
              </select>

              <select
                value={filtroUrgencia}
                onChange={(e) => {
                  setFiltroUrgencia(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Todas as urgências</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => {
                  setFiltroStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="todas">Todas as mensagens</option>
                <option value="nao_lidas">Apenas não lidas</option>
                <option value="lidas">Apenas lidas</option>
              </select>
            </div>
          </div>

          {/* Lista de mensagens */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando mensagens...</div>
            ) : mensagens.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <Inbox className="w-16 h-16 text-gray-300" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma mensagem encontrada
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {filtroCategoria || filtroUrgencia || filtroStatus !== 'todas' 
                        ? 'Tente ajustar os filtros para encontrar mensagens.'
                        : 'Não há mensagens nesta categoria no momento.'
                      }
                    </p>
                    {(filtroCategoria || filtroUrgencia || filtroStatus !== 'todas') && (
                      <button
                        onClick={() => {
                          setFiltroCategoria('');
                          setFiltroUrgencia('');
                          setFiltroStatus('todas');
                          setCurrentPage(1);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              mensagens.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-4 hover:bg-gray-50 ${!msg.lida ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900 flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{msg.paciente_nome}</span>
                        </span>
                        
                        {!msg.lida && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        
                        {msg.categoria && (
                          <span className={`text-xs px-2 py-1 rounded ${getCategoriaColor(msg.categoria)}`}>
                            {msg.categoria}
                          </span>
                        )}
                        
                        {msg.urgencia && (
                          <span className={`text-xs px-2 py-1 rounded ${getUrgenciaColor(msg.urgencia)}`}>
                            {msg.urgencia}
                          </span>
                        )}

                        {msg.paciente_id && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            ID: {msg.paciente_id}
                          </span>
                        )}

                        {msg.encaminhando_para && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                            Para: {msg.encaminhando_para}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{msg.conteudo}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center space-x-1">
                          {activeTab === 'app' ? (
                            <Smartphone className="w-3 h-3" />
                          ) : (
                            <MessageSquare className="w-3 h-3" />
                          )}
                          <span>{activeTab === 'app' ? 'App' : 'WhatsApp'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!msg.lida && (
                        <button
                          onClick={() => marcarComoLida(msg.id)}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                          <span>Lida</span>
                        </button>
                      )}
                      
                      {!msg.encaminhando_para && (
                        <button
                          onClick={() => abrirModalEncaminhar(msg)}
                          className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                          title="Encaminhar mensagem"
                        >
                          <Send className="w-4 h-4" />
                          <span>Encaminhar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Paginação */}
        {!loading && totalCount > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{startItem}</span> até{' '}
                  <span className="font-medium">{endItem}</span> de{' '}
                  <span className="font-medium">{totalCount}</span> mensagens
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Encaminhar */}
        {showEncaminharModal && mensagemParaEncaminhar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>Encaminhar Mensagem</span>
                </h3>
                <button
                  onClick={() => {
                    setShowEncaminharModal(false);
                    setMensagemParaEncaminhar(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Paciente:</p>
                  <p className="font-medium">{mensagemParaEncaminhar.paciente_nome}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Mensagem:</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {mensagemParaEncaminhar.conteudo.substring(0, 150)}
                    {mensagemParaEncaminhar.conteudo.length > 150 && '...'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Encaminhar para:
                  </label>
                  <select
                    value={medicoSelecionado}
                    onChange={(e) => setMedicoSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  >
                    {medicos.map((medico) => (
                      <option key={medico.id} value={medico.nome}>
                        {medico.nome} {medico.especialidade && `- ${medico.especialidade}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEncaminharModal(false);
                      setMensagemParaEncaminhar(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEncaminhamento}
                    className="flex items-center space-x-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Encaminhar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

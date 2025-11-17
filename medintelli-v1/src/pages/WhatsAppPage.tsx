import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase } from '@/lib/supabase';
import { WhatsAppMessage } from '@/types';
import Layout from '@/components/Layout';
import { MessageSquare, Send, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ITEMS_PER_PAGE = 20;

export default function WhatsAppPage() {
  const { session, profile } = useAuth();
  const [mensagens, setMensagens] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadMensagens();
  }, [filtroCategoria, filtroUrgencia, currentPage]);

  const loadMensagens = async () => {
    setLoading(true);
    try {
      // Get total count
      let countQuery = supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true });

      if (filtroCategoria) {
        countQuery = countQuery.eq('categoria', filtroCategoria);
      }
      if (filtroUrgencia) {
        countQuery = countQuery.eq('urgencia', filtroUrgencia);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filtroCategoria) {
        query = query.eq('categoria', filtroCategoria);
      }
      if (filtroUrgencia) {
        query = query.eq('urgencia', filtroUrgencia);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEncaminharMedico = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ encaminhado_para: 'medico' })
        .eq('id', id);

      if (error) throw error;
      alert('Mensagem encaminhada ao médico');
      loadMensagens();
    } catch (error) {
      console.error('Erro ao encaminhar:', error);
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="w-7 h-7" />
            <span>Centro de Mensagens WhatsApp</span>
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
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
              onChange={(e) => setFiltroUrgencia(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Todas as urgências</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando mensagens...</div>
          ) : mensagens.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhuma mensagem encontrada</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mensagens.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          {msg.patient_name || msg.phone_number || 'Desconhecido'}
                        </span>
                        {msg.categoria && (
                          <span className={`text-xs px-2 py-1 rounded ${getCategoriaColor(msg.categoria)}`}>
                            {msg.categoria}
                          </span>
                        )}
                        {msg.urgencia && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                            {msg.urgencia}
                          </span>
                        )}
                        {msg.encaminhado_para === 'medico' && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                            Encaminhado ao Médico
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{msg.message_content || msg.message}</p>
                      
                      <p className="text-xs text-gray-500">
                        {msg.timestamp 
                          ? format(new Date(msg.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : msg.created_at 
                          ? format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'Data não disponível'}
                      </p>
                    </div>

                    {msg.encaminhado_para !== 'medico' && (
                      <button
                        onClick={() => handleEncaminharMedico(msg.id)}
                        className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Encaminhar ao Médico</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
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
      </div>
    </Layout>
  );
}

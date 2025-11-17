import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Agendamento } from '@/types';
import { Calendar, Clock, CheckCircle, XCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoPage() {
  const { paciente } = useAuth();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'proximos' | 'passados'>('proximos');

  useEffect(() => {
    if (!paciente) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const loadAgendamentos = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('agendamentos')
          .select('*')
          .eq('paciente_id', paciente.id)
          .order('data_agendamento', { ascending: false });

        // Aplicar filtro
        const now = new Date().toISOString();
        if (filter === 'proximos') {
          query = query.gte('data_agendamento', now).neq('status', 'cancelado');
        } else if (filter === 'passados') {
          query = query.lt('data_agendamento', now);
        }

        const { data, error } = await query;

        if (error) throw error;

        setAgendamentos(data || []);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Erro ao carregar agendamentos:', error);
          setAgendamentos([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAgendamentos();

    // Escutar evento de refetch
    const handleRefetch = () => loadAgendamentos();
    window.addEventListener('refetch-historico', handleRefetch);

    return () => {
      clearTimeout(timeout);
      controller.abort();
      window.removeEventListener('refetch-historico', handleRefetch);
    };
  }, [paciente, filter]);

  const getStatusColor = useCallback((status?: string) => {
    switch (status) {
      case 'confirmado':
      case 'agendado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'concluido':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, []);

  const getStatusIcon = useCallback((status?: string) => {
    switch (status) {
      case 'confirmado':
      case 'agendado':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelado':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'concluido':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  }, []);

  // Estatisticas memoizadas
  const stats = useMemo(() => {
    return {
      agendados: agendamentos.filter((a) => a.status === 'confirmado' || a.status === 'agendado').length,
      concluidos: agendamentos.filter((a) => a.status === 'concluido').length,
      cancelados: agendamentos.filter((a) => a.status === 'cancelado').length,
    };
  }, [agendamentos]);

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      {/* Header com Botao Voltar */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-purple-600" />
          Historico de Agendamentos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Visualize seus agendamentos passados e futuros
        </p>
      </div>

      {/* Filtros */}
      <div className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex gap-2">
          <button
            onClick={() => setFilter('proximos')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'proximos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Proximos
          </button>
          <button
            onClick={() => setFilter('passados')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'passados'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Passados
          </button>
          <button
            onClick={() => setFilter('todos')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'todos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Carregando agendamentos...</span>
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Nenhum agendamento encontrado</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'proximos' && 'Voce nao possui agendamentos futuros'}
              {filter === 'passados' && 'Voce nao possui historico de agendamentos'}
              {filter === 'todos' && 'Voce ainda nao possui agendamentos'}
            </p>
          </div>
        ) : (
          agendamentos.map((agendamento) => (
            <div
              key={agendamento.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(agendamento.status)}
                    <h3 className="font-semibold text-gray-900">
                      {agendamento.tipo_consulta || 'Consulta Medica'}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>
                        {format(new Date(agendamento.data_agendamento), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>
                        {format(new Date(agendamento.data_agendamento), 'HH:mm', {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {agendamento.observacoes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Observacoes:</span> {agendamento.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <span
                    className={`inline-block text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(
                      agendamento.status
                    )}`}
                  >
                    {agendamento.status || 'Pendente'}
                  </span>
                  
                  {agendamento.confirmado_clinica && (
                    <div className="mt-2">
                      <span className="inline-block text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                        Confirmado
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informacoes adicionais */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Criado em:{' '}
                    {format(new Date(agendamento.created_at || agendamento.data_agendamento), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                  {agendamento.origem && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {agendamento.origem === 'app_paciente' ? 'App' : 'Sistema'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumo */}
      {!loading && agendamentos.length > 0 && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-sm p-4">
            <p className="text-sm text-blue-900 font-medium">
              Total de agendamentos: {agendamentos.length}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                <p className="font-semibold text-green-700">{stats.agendados}</p>
                <p className="text-gray-600">Agendados</p>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                <p className="font-semibold text-blue-700">{stats.concluidos}</p>
                <p className="text-gray-600">Concluidos</p>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                <p className="font-semibold text-red-700">{stats.cancelados}</p>
                <p className="text-gray-600">Cancelados</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

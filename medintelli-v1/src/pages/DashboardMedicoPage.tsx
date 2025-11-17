import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase } from '@/lib/supabase';
import { WhatsAppMessage } from '@/types';
import Layout from '@/components/Layout';
import { Bell, MessageSquare, FileText, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardMedicoPage() {
  const { profile } = useAuth();
  const [conversasNovas, setConversasNovas] = useState<WhatsAppMessage[]>([]);
  const [examesRecebidos, setExamesRecebidos] = useState<WhatsAppMessage[]>([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([]);
  const [alertasUrgentes, setAlertasUrgentes] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    totalConversas: 0,
    totalExames: 0,
    tempoMedio: '0 min',
    alertasUrgentes: 0
  });

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel('medico-dashboard')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        () => {
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Conversas novas para médico
      const { data: conversas, error: errorConversas } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('encaminhado_para', 'medico')
        .is('atendido_por', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (errorConversas) throw errorConversas;
      setConversasNovas(conversas || []);

      // Exames recebidos
      const { data: exames, error: errorExames } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('categoria', 'resultado')
        .order('created_at', { ascending: false })
        .limit(20);

      if (errorExames) throw errorExames;
      setExamesRecebidos(exames || []);

      // Alertas urgentes (prioridade alta)
      const { data: alertas, error: errorAlertas } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('prioridade', 'alta')
        .is('atendido_por', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (errorAlertas) throw errorAlertas;
      setAlertasUrgentes(alertas || []);

      // Agendamentos de hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: agendamentos, error: errorAgendamentos } = await supabase
        .from('agendamentos')
        .select(`
          *,
          pacientes (
            nome,
            telefone
          )
        `)
        .gte('data_agendamento', hoje)
        .lt('data_agendamento', hoje + ' 23:59:59')
        .order('hora_agendamento', { ascending: true });

      if (errorAgendamentos) throw errorAgendamentos;
      setAgendamentosHoje(agendamentos || []);

      // Estatísticas gerais
      const totalConversas = conversas?.length || 0;
      const totalExames = exames?.length || 0;
      const alertasCount = alertas?.length || 0;

      setEstatisticas({
        totalConversas,
        totalExames,
        tempoMedio: '15 min',
        alertasUrgentes: alertasCount
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarLido = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ atendido_por: profile?.id })
        .eq('id', id);

      if (error) throw error;
      loadDashboard();
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
      alert('Erro ao marcar mensagem como lida');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Bell className="w-7 h-7" />
            <span>Dashboard Médico - Painel de Controle</span>
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✅ Sistema IA Ativo
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              🔄 Sincronização Automática
            </div>
          </div>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversas Novas</p>
                <p className="text-2xl font-bold text-blue-600">{estatisticas.totalConversas}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exames Recebidos</p>
                <p className="text-2xl font-bold text-purple-600">{estatisticas.totalExames}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-green-600">{agendamentosHoje.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alertas Urgentes</p>
                <p className="text-2xl font-bold text-red-600">{estatisticas.alertasUrgentes}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Agendamentos de Hoje */}
        {agendamentosHoje.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-green-50 border-b border-green-100 p-4">
              <h2 className="text-lg font-semibold text-green-900 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Agendamentos de Hoje</span>
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {agendamentosHoje.length}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {agendamentosHoje.map((agendamento) => (
                <div key={agendamento.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {agendamento.pacientes?.nome || 'Paciente não informado'}
                      </span>
                      <p className="text-sm text-gray-600">
                        Horário: {agendamento.hora_agendamento} - {agendamento.tipo_consulta}
                      </p>
                      <p className="text-xs text-gray-500">
                        {agendamento.pacientes?.telefone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                        agendamento.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {agendamento.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas Urgentes */}
        {alertasUrgentes.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg">
            <div className="bg-red-100 border-b border-red-200 p-4">
              <h2 className="text-lg font-semibold text-red-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Alertas Urgentes - Requer Atenção Imediata</span>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  {alertasUrgentes.length}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-red-200 max-h-64 overflow-y-auto">
              {alertasUrgentes.map((alerta) => (
                <div key={alerta.id} className="p-4 hover:bg-red-25">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-900">
                          {alerta.patient_name || alerta.phone_number}
                        </span>
                        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
                          URGENTE
                        </span>
                      </div>
                      <p className="text-sm text-red-800 mb-2">{alerta.message_content || alerta.message}</p>
                      <p className="text-xs text-red-600">
                        {alerta.created_at && format(new Date(alerta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarcarLido(alerta.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Responder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-100 p-4">
              <h2 className="text-lg font-semibold text-blue-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Novas Conversas Relevantes</span>
                {conversasNovas.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {conversasNovas.length}
                  </span>
                )}
              </h2>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : conversasNovas.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Nenhuma conversa nova</div>
              ) : (
                conversasNovas.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="font-semibold text-gray-900">
                            {msg.patient_name || msg.phone_number}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{msg.message_content || msg.message}</p>
                        <p className="text-xs text-gray-500">
                          {msg.created_at && format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarcarLido(msg.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Marcar Lido
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-purple-50 border-b border-purple-100 p-4">
              <h2 className="text-lg font-semibold text-purple-900 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Exames Recebidos</span>
                {examesRecebidos.length > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {examesRecebidos.length}
                  </span>
                )}
              </h2>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : examesRecebidos.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Nenhum exame recebido</div>
              ) : (
                examesRecebidos.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block mb-1">
                        {msg.patient_name || msg.phone_number}
                      </span>
                      <p className="text-sm text-gray-700 mb-2">{msg.message_content || msg.message}</p>
                      <p className="text-xs text-gray-500">
                        {msg.created_at && format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Sistema de Alerta Ativo</h3>
              <p className="text-sm text-yellow-800">
                Você será notificado se não responder às conversas relevantes em até 30 minutos.
                A secretaria receberá um alerta para lembrá-lo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

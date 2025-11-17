import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { WhatsAppMessage } from '@/types';
import Layout from '@/components/Layout';
import { Bell, MessageSquare, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardMedicoPage() {
  const { profile } = useAuth();
  const [conversasNovas, setConversasNovas] = useState<WhatsAppMessage[]>([]);
  const [examesRecebidos, setExamesRecebidos] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data: conversas, error: errorConversas } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('encaminhado_para', 'medico')
        .is('atendido_por', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (errorConversas) throw errorConversas;
      setConversasNovas(conversas || []);

      const { data: exames, error: errorExames } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('categoria', 'resultado')
        .order('created_at', { ascending: false })
        .limit(20);

      if (errorExames) throw errorExames;
      setExamesRecebidos(exames || []);
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
            <span>Dashboard Médico - Alertas</span>
          </h1>
        </div>

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

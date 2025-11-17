import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, FUNCTION_URL } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Calendar, Users, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Skeleton Component
const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    agendamentosHoje: 0,
    filaEspera: 0,
    mensagensPendentes: 0,
    proximosAgendamentos: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      // Promise.all para carregar dados em paralelo (PATCH PACK ITEM 3.5)
      const [agendamentosRes, filaRes, mensagensRes, proximosRes] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('*')
          .gte('data_agendamento', hoje.toISOString())
          .lt('data_agendamento', amanha.toISOString())
          .neq('status', 'cancelado'),
        supabase
          .from('fila_espera')
          .select('*')
          .eq('status', 'aguardando'),
        supabase
          .from('whatsapp_messages')
          .select('*')
          .is('atendido_por', null)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('agendamentos')
          .select('*')
          .gte('data_agendamento', new Date().toISOString())
          .neq('status', 'cancelado')
          .order('data_agendamento', { ascending: true })
          .limit(5)
      ]);

      setStats({
        agendamentosHoje: agendamentosRes.data?.length || 0,
        filaEspera: filaRes.data?.length || 0,
        mensagensPendentes: mensagensRes.data?.length || 0,
        proximosAgendamentos: proximosRes.data || [],
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cards clicáveis (PATCH PACK ITEM 3.1)
  const cards = [
    {
      label: 'Agendamentos Hoje',
      value: stats.agendamentosHoje,
      icon: Calendar,
      color: 'blue',
      route: '/agenda'
    },
    {
      label: 'Fila de Espera',
      value: stats.filaEspera,
      icon: Users,
      color: 'orange',
      route: '/fila-espera'
    },
    {
      label: 'Mensagens Pendentes',
      value: stats.mensagensPendentes,
      icon: MessageSquare,
      color: 'purple',
      route: '/painel-paciente'
    },
    {
      label: 'Taxa de Ocupação',
      value: stats.agendamentosHoje > 0 ? '85%' : '0%',
      icon: TrendingUp,
      color: 'green',
      route: '/dashboard-medico'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo, {profile?.nome}
          </h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Cards com Skeleton Loading */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {loading ? (
            // Skeleton loading (PATCH PACK ITEM 3.1)
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            cards.map((card, index) => (
              <div
                key={index}
                onClick={() => navigate(card.route)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow hover:border-gray-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{card.label}</p>
                    <p className={`text-3xl font-bold text-${card.color}-600 mt-2`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 bg-${card.color}-100 rounded-lg flex items-center justify-center`}>
                    <card.icon className={`w-6 h-6 text-${card.color}-600`} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Próximos Agendamentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Próximos Agendamentos</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : stats.proximosAgendamentos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum agendamento próximo</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.proximosAgendamentos.map((agendamento) => (
                <div key={agendamento.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/agenda')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{agendamento.paciente_nome || 'Paciente'}</p>
                      <p className="text-sm text-gray-600">{agendamento.tipo_consulta}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(agendamento.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${
                        agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agendamento.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

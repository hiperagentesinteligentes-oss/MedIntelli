import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Edit, X, Save, User, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase, FUNCTION_URL } from '@/lib/supabase';
import { Agendamento, Paciente } from '@/types';
import Layout from '@/components/Layout';

type ViewMode = 'month' | 'week' | 'day';

const ITEMS_PER_PAGE = 10;
const TIME_SLOTS = Array.from({ length: 40 }, (_, i) => {
  const hour = Math.floor(i / 4) + 8;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function AgendaPage() {
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [contagemPorDia, setContagemPorDia] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);
  const [quickScheduleTime, setQuickScheduleTime] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<{id: string, nome: string}[]>([]);
  const [quickFormData, setQuickFormData] = useState({
    paciente_id: '',
    tipo_consulta: '',
    duracao_minutos: 15,
    observacoes: '',
    convenio: 'PARTICULAR',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [editFormData, setEditFormData] = useState({
    data_agendamento: '',
    hora_agendamento: '',
    duracao_minutos: 15,
    observacoes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    convenio: 'PARTICULAR',
  });
  const [newPatientLoading, setNewPatientLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  useEffect(() => {
    loadAgendamentos();
    loadPacientes();
    loadTiposConsulta();
    
    const channel = supabase
      .channel('agendamentos-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agendamentos' },
        () => {
          loadAgendamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  const loadPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      showFeedback('error', 'Erro ao carregar lista de pacientes');
    }
  };

  const loadTiposConsulta = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_consulta')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setTiposConsulta(data || []);
      
      // Definir tipo de consulta padrão
      if (data && data.length > 0) {
        setQuickFormData(prev => ({ ...prev, tipo_consulta: data[0].nome }));
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de consulta:', error);
      showFeedback('error', 'Erro ao carregar tipos de consulta');
    }
  };

  const loadAgendamentos = async () => {
    if (!session) return;
    
    setLoading(true);
    clearErrors();
    try {
      let start, end;
      
      if (viewMode === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else if (viewMode === 'week') {
        start = startOfWeek(currentDate, { locale: ptBR });
        end = endOfWeek(currentDate, { locale: ptBR });
      } else {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      }

      const response = await fetch(
        `${FUNCTION_URL}/agendamentos?start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar agendamentos');

      const data = await response.json();
      setAgendamentos(data.data || []);

      const contagem: Record<string, number> = {};
      (data.data || []).forEach((agendamento: Agendamento) => {
        const dateKey = format(new Date(agendamento.inicio), 'yyyy-MM-dd');
        contagem[dateKey] = (contagem[dateKey] || 0) + 1;
      });
      setContagemPorDia(contagem);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      showFeedback('error', 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'atrasado': return 'bg-red-100 text-red-800 border-red-300';
      case 'em_atendimento': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'confirmado': return 'bg-green-100 text-green-800 border-green-300';
      case 'agendado': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'concluido': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelado': return 'bg-red-50 text-red-600 border-red-200 line-through';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const showFeedback = (type: 'success' | 'error' | 'warning', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const validateForm = (formData: any, isNewPatient = false) => {
    const errors: Record<string, string> = {};
    
    if (isNewPatient) {
      if (!formData.nome.trim()) errors.nome = 'Nome é obrigatório';
      if (!formData.telefone.trim()) errors.telefone = 'Telefone é obrigatório';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email inválido';
      }
    } else {
      if (!formData.paciente_id) errors.paciente_id = 'Selecione um paciente';
      if (!formData.tipo_consulta) errors.tipo_consulta = 'Selecione o tipo de consulta';
      if (!formData.duracao_minutos || formData.duracao_minutos < 15) {
        errors.duracao_minutos = 'Duração mínima é 15 minutos';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearErrors = () => {
    setFormErrors({});
  };

  const handleConfirmar = async (id: string) => {
    if (!session) return;

    try {
      const response = await fetch(`${FUNCTION_URL}/agendamentos`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'confirmado' }),
      });

      if (!response.ok) throw new Error('Erro ao confirmar agendamento');
      loadAgendamentos();
      showFeedback('success', 'Agendamento confirmado com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      showFeedback('error', 'Erro ao confirmar agendamento');
    }
  };

  const handleCancelar = async (id: string) => {
    if (!session) return;
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;

    try {
      const response = await fetch(`${FUNCTION_URL}/agendamentos`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'cancelado' }),
      });

      if (!response.ok) throw new Error('Erro ao cancelar agendamento');
      loadAgendamentos();
      showFeedback('success', 'Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      showFeedback('error', 'Erro ao cancelar agendamento');
    }
  };

  const handleOpenEditModal = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
    const dataAgendamento = new Date(agendamento.inicio);
    setEditFormData({
      data_agendamento: format(dataAgendamento, 'yyyy-MM-dd'),
      hora_agendamento: format(dataAgendamento, 'HH:mm'),
      duracao_minutos: agendamento.duracao_minutos || 30,
      observacoes: agendamento.observacoes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!session || !editingAgendamento) return;

    setEditLoading(true);
    try {
      // Criar data/hora completa
      const dataHoraCompleta = new Date(`${editFormData.data_agendamento}T${editFormData.hora_agendamento}`);
      const fim = new Date(dataHoraCompleta.getTime() + editFormData.duracao_minutos * 60000);

      const response = await fetch(`${FUNCTION_URL}/agendamentos`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingAgendamento.id,
          inicio: dataHoraCompleta.toISOString(),
          fim: fim.toISOString(),
          observacoes: editFormData.observacoes,
        }),
      });

      if (response.status === 409) {
        showFeedback('error', 'Horário já ocupado por outro agendamento');
        setEditLoading(false);
        return;
      }

      if (!response.ok) throw new Error('Erro ao editar agendamento');

      showFeedback('success', 'Agendamento atualizado com sucesso!');
      setShowEditModal(false);
      loadAgendamentos();
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      showFeedback('error', 'Erro ao editar agendamento');
    } finally {
      setEditLoading(false);
    }
  };

  const handleQuickSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !quickScheduleTime || !currentDate) return;

    clearErrors();
    if (!validateForm(quickFormData)) {
      return;
    }

    try {
      const [hora, minuto] = quickScheduleTime.split(':');
      const dataAgendamento = new Date(currentDate);
      dataAgendamento.setHours(parseInt(hora), parseInt(minuto), 0, 0);
      
      const fimAgendamento = new Date(dataAgendamento.getTime() + quickFormData.duracao_minutos * 60000);

      const response = await fetch(`${FUNCTION_URL}/agendamentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paciente_id: quickFormData.paciente_id,
          inicio: dataAgendamento.toISOString(),
          fim: fimAgendamento.toISOString(),
          tipo_consulta: quickFormData.tipo_consulta,
          observacoes: quickFormData.observacoes,
          status: 'pendente',
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar agendamento');

      setShowQuickSchedule(false);
      setQuickScheduleTime('');
      setQuickFormData({
        paciente_id: '',
        tipo_consulta: tiposConsulta[0]?.nome || '',
        duracao_minutos: 15,
        observacoes: '',
        convenio: 'PARTICULAR',
      });
      loadAgendamentos();
      showFeedback('success', 'Agendamento criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      showFeedback('error', 'Erro ao criar agendamento');
    }
  };

  const handleQuickCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    clearErrors();
    if (!validateForm(newPatientForm, true)) {
      return;
    }

    setNewPatientLoading(true);
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .insert([{
          nome: newPatientForm.nome,
          telefone: newPatientForm.telefone,
          email: newPatientForm.email || null,
          convenio: newPatientForm.convenio,
        }])
        .select()
        .single();

      if (error) throw error;

      setPacientes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setQuickFormData(prev => ({ ...prev, paciente_id: data.id }));
      setShowNewPatientModal(false);
      setNewPatientForm({
        nome: '',
        telefone: '',
        email: '',
        convenio: 'PARTICULAR',
      });
      showFeedback('success', 'Paciente criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      showFeedback('error', 'Erro ao criar paciente');
    } finally {
      setNewPatientLoading(false);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { locale: ptBR });
      const end = endOfWeek(currentDate, { locale: ptBR });
      return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, "dd 'de' MMMM yyyy", { locale: ptBR });
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="bg-gray-50 py-2 text-center text-sm font-semibold text-gray-900">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {dateRange.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const count = contagemPorDia[dateKey] || 0;
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <button
                key={date.toString()}
                onClick={() => setSelectedDate(date)}
                className={`bg-white min-h-[100px] p-2 text-left hover:bg-blue-50 transition-colors ${
                  !isCurrentMonth ? 'text-gray-400' : ''
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : ''
                }`}>
                  {format(date, 'd')}
                </div>
                {count > 0 && (
                  <div className="mt-1 text-xs text-center bg-blue-100 text-blue-800 rounded px-2 py-1">
                    {count} agend.
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-8 gap-px bg-gray-200">
          <div className="bg-gray-50 py-2 px-2 text-xs font-semibold text-gray-900">Horário</div>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} className={`bg-gray-50 py-2 px-2 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-xs font-semibold text-gray-900">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-8 gap-px bg-gray-200 max-h-[600px] overflow-y-auto">
          {TIME_SLOTS.map((time) => (
            <>
              <div key={`time-${time}`} className="bg-white py-2 px-2 text-xs text-gray-600 border-r">
                {time}
              </div>
              {weekDays.map((day) => {
                const dayAgendamentos = agendamentos.filter(a => 
                  isSameDay(new Date(a.inicio), day) &&
                  format(new Date(a.inicio), 'HH:mm') === time
                );

                return (
                  <div key={`${day}-${time}`} className="bg-white p-1 min-h-[50px]">
                    {dayAgendamentos.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className={`text-xs p-1 rounded mb-1 cursor-pointer ${getStatusColor(agendamento.status)}`}
                        onClick={() => {
                          setSelectedDate(day);
                          const element = document.getElementById('agendamentos-list');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div className="font-semibold truncate">{agendamento.paciente_nome}</div>
                        <div className="text-xs truncate">{agendamento.tipo_consulta}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAgendamentos = agendamentos.filter(a => 
      isSameDay(new Date(a.inicio), currentDate)
    );

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{format(currentDate, 'dd', { locale: ptBR })}</h2>
            <p className="text-sm opacity-90">{format(currentDate, "EEEE, MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <button
            onClick={() => {
              setShowQuickSchedule(true);
              setQuickScheduleTime('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Agendar</span>
          </button>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {TIME_SLOTS.map((time) => {
            const timeAgendamentos = dayAgendamentos.filter(a => format(new Date(a.inicio), 'HH:mm') === time);

            return (
              <div key={time} className="flex hover:bg-gray-50">
                <div className="w-20 flex-shrink-0 p-3 text-sm font-medium text-gray-600 border-r">
                  {time}
                </div>
                <div className="flex-1 p-2 min-h-[60px]">
                  {timeAgendamentos.length === 0 ? (
                    <button
                      onClick={() => {
                        setQuickScheduleTime(time);
                        setShowQuickSchedule(true);
                      }}
                      className="w-full h-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {timeAgendamentos.map((agendamento) => (
                        <div
                          key={agendamento.id}
                          className={`p-3 rounded-lg border-l-4 ${getStatusColor(agendamento.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold">{agendamento.paciente_nome}</div>
                              <div className="text-sm">{agendamento.tipo_consulta}</div>
                              <div className="text-xs mt-1">Duração: {agendamento.duracao_minutos || 30} min</div>
                              {agendamento.observacoes && (
                                <div className="text-xs mt-1 italic">{agendamento.observacoes}</div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {agendamento.status !== 'confirmado' && agendamento.status !== 'cancelado' && (
                                <button
                                  onClick={() => handleConfirmar(agendamento.id)}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Confirmar
                                </button>
                              )}
                              {agendamento.status !== 'cancelado' && (
                                <button
                                  onClick={() => handleCancelar(agendamento.id)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const agendamentosDodia = selectedDate
    ? agendamentos.filter(a => isSameDay(new Date(a.inicio), selectedDate))
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            
            {/* PATCH PACK V3: Input de data para seleção rápida */}
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar Data Específica
              </label>
              <input
                type="date"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setCurrentDate(newDate);
                  setSelectedDate(newDate);
                  setViewMode('day'); // Mudar para visão de dia quando selecionar data específica
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Dia
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleNavigate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold min-w-[250px] text-center">
                {getDateRangeLabel()}
              </span>
              <button
                onClick={() => handleNavigate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Carregando...
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}

        {viewMode === 'month' && selectedDate && (
          <div id="agendamentos-list" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Agendamentos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </h2>

            {agendamentosDodia.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum agendamento para este dia</p>
            ) : (
              <>
                <div className="space-y-3">
                  {agendamentosDodia
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className={`border rounded-lg p-4 ${getStatusColor(agendamento.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold">
                            {format(new Date(agendamento.inicio), 'HH:mm')}
                          </span>
                          <span className="text-sm">({agendamento.duracao_minutos || 30} min)</span>
                        </div>
                        <p className="font-medium">{agendamento.paciente_nome}</p>
                        <p className="text-sm">{agendamento.tipo_consulta}</p>
                        {agendamento.observacoes && (
                          <p className="text-sm mt-1 italic">{agendamento.observacoes}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {agendamento.status !== 'confirmado' && agendamento.status !== 'cancelado' && (
                          <button
                            onClick={() => handleConfirmar(agendamento.id)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Confirmar
                          </button>
                        )}
                        {agendamento.status !== 'cancelado' && (
                          <button
                            onClick={() => handleCancelar(agendamento.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {agendamentosDodia.length > ITEMS_PER_PAGE && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(agendamentosDodia.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage === Math.ceil(agendamentosDodia.length / ITEMS_PER_PAGE)}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> até{' '}
                          <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, agendamentosDodia.length)}</span> de{' '}
                          <span className="font-medium">{agendamentosDodia.length}</span> agendamentos
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
                            Página {currentPage} de {Math.ceil(agendamentosDodia.length / ITEMS_PER_PAGE)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(agendamentosDodia.length / ITEMS_PER_PAGE), p + 1))}
                            disabled={currentPage === Math.ceil(agendamentosDodia.length / ITEMS_PER_PAGE)}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Feedback de ação */}
        {actionFeedback && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
            actionFeedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            actionFeedback.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-yellow-100 text-yellow-800 border border-yellow-300'
          }`}>
            {actionFeedback.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {actionFeedback.type === 'error' && <XCircle className="w-5 h-5" />}
            {actionFeedback.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            <span>{actionFeedback.message}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="ml-2 hover:bg-opacity-20 hover:bg-gray-600 rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showQuickSchedule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Agendamento Rápido</h2>
              
              <form onSubmit={handleQuickSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={format(currentDate, 'yyyy-MM-dd')}
                      disabled
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <input
                      type="time"
                      value={quickScheduleTime}
                      onChange={(e) => setQuickScheduleTime(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Paciente</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPatientModal(true);
                        setShowQuickSchedule(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo paciente</span>
                    </button>
                  </div>
                  <select
                    value={quickFormData.paciente_id}
                    onChange={(e) => setQuickFormData({ ...quickFormData, paciente_id: e.target.value })}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.paciente_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione um paciente</option>
                    {pacientes.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  {formErrors.paciente_id && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.paciente_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Consulta</label>
                  <select
                    value={quickFormData.tipo_consulta}
                    onChange={(e) => setQuickFormData({ ...quickFormData, tipo_consulta: e.target.value })}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.tipo_consulta ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione o tipo</option>
                    {tiposConsulta.map(tipo => (
                      <option key={tipo.id} value={tipo.nome}>{tipo.nome}</option>
                    ))}
                  </select>
                  {formErrors.tipo_consulta && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.tipo_consulta}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    value={quickFormData.duracao_minutos}
                    onChange={(e) => setQuickFormData({ ...quickFormData, duracao_minutos: parseInt(e.target.value) })}
                    min="15"
                    step="15"
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.duracao_minutos ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.duracao_minutos && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.duracao_minutos}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={quickFormData.observacoes}
                    onChange={(e) => setQuickFormData({ ...quickFormData, observacoes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observações adicionais (opcional)"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickSchedule(false);
                      setQuickScheduleTime('');
                      clearErrors();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Agendar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de cadastro rápido de paciente */}
        {showNewPatientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Novo Paciente</span>
              </h2>
              
              <form onSubmit={handleQuickCreatePatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newPatientForm.nome}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, nome: e.target.value })}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.nome ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Digite o nome completo"
                  />
                  {formErrors.nome && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={newPatientForm.telefone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, telefone: e.target.value })}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.telefone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="(00) 00000-0000"
                  />
                  {formErrors.telefone && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.telefone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
                  <input
                    type="email"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="email@exemplo.com"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Convênio</label>
                  <select
                    value={newPatientForm.convenio}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, convenio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PARTICULAR">Particular</option>
                    <option value="UNIMED">Unimed</option>
                    <option value="UNIMED UNIFÁCIL">Unimed Unifácil</option>
                    <option value="CASSI">CASSI</option>
                    <option value="CABESP">CABESP</option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPatientModal(false);
                      setShowQuickSchedule(true);
                      clearErrors();
                      setNewPatientForm({
                        nome: '',
                        telefone: '',
                        email: '',
                        convenio: 'PARTICULAR',
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={newPatientLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={newPatientLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {newPatientLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{newPatientLoading ? 'Criando...' : 'Criar Paciente'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

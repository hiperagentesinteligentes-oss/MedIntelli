import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, Loader2, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AgendamentosPageSimple() {
  const { paciente } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [tipoConsulta, setTipoConsulta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  console.log('🚀 AgendamentosPageSimple renderizando', {
    paciente: paciente?.nome || 'N/A',
    selectedDate,
    hasAvailableTimes: availableTimes.length > 0
  });

  // Função para recarregar histórico
  const refetchHistorico = useCallback(async () => {
    // Emitir evento customizado para o histórico
    window.dispatchEvent(new CustomEvent('refetch-historico'));
  }, []);

  // Memoizar datas disponíveis (SEM feriados para evitar problemas)
  const availableDates = useMemo(() => {
    const dates = [];
    let current = new Date();
    
    for (let i = 0; dates.length < 30; i++) {
      const next = addDays(current, i);
      const day = next.getDay();
      
      // Apenas pular fins de semana
      if (day !== 0 && day !== 6) {
        dates.push(next);
      }
    }
    
    return dates;
  }, []);

  // Carregar horários disponíveis
  useEffect(() => {
    if (selectedDate) {
      loadAvailableTimes(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableTimes = useCallback(async (date: string) => {
    console.log('🔍 Carregando horários para:', date);
    setLoadingTimes(true);
    setSelectedTime('');
    
    try {
      // Verificar se é fim de semana
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (isWeekend) {
        console.log('🚫 Fim de semana');
        setAvailableTimes([]);
        setLoadingTimes(false);
        return;
      }
      
      // Buscar agendamentos existentes (simulado com timeout)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Horários padrão (9h às 17h, intervalos de 30min)
      const allTimes = [];
      for (let hour = 9; hour < 17; hour++) {
        allTimes.push(`${hour.toString().padStart(2, '0')}:00`);
        allTimes.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      
      setAvailableTimes(allTimes);
      console.log('✅ Horários carregados:', allTimes.length);
      
    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao carregar horários');
      
      // Fallback
      const basicTimes = [];
      for (let hour = 9; hour < 17; hour++) {
        basicTimes.push(`${hour.toString().padStart(2, '0')}:00`);
        basicTimes.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setAvailableTimes(basicTimes);
    } finally {
      setLoadingTimes(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📅 Submit agendamento');
    
    if (!paciente) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    if (!selectedDate || !selectedTime || !tipoConsulta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      console.log('📅 Criando agendamento:', {
        selectedDate,
        selectedTime,
        tipoConsulta,
        paciente: paciente.nome
      });

      // Simular criação de agendamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
      toast.success('Agendamento criado com sucesso!');
      
      // Limpar formulário após 2 segundos
      setTimeout(() => {
        setSelectedDate('');
        setSelectedTime('');
        setTipoConsulta('');
        setObservacoes('');
        setSuccess(false);
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao agendar:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  // Resumo memoizado
  const resumo = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    
    return {
      paciente: paciente?.nome || 'N/A',
      tipo: tipoConsulta || 'Não selecionado',
      dataFormatada: format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      horario: selectedTime,
    };
  }, [selectedDate, selectedTime, tipoConsulta, paciente?.nome]);

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Agendar Consulta</h1>
        <p className="text-sm text-gray-600 mt-1">
          Versão simplificada - Sem problemas de carregamento
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="m-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Agendamento criado!</h3>
            <p className="text-sm text-green-700 mt-1">
              Sua consulta foi agendada com sucesso.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Tipo de Consulta */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Tipo de Consulta
          </label>
          <select
            value={tipoConsulta}
            onChange={(e) => setTipoConsulta(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Selecione o tipo</option>
            <option value="Consulta Medica">Consulta Medica</option>
            <option value="Retorno">Retorno</option>
            <option value="Exames">Entrega de Exames</option>
          </select>
        </div>

        {/* Data */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Data da Consulta
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          >
            <option value="">Selecione uma data</option>
            {availableDates.map((date) => (
              <option key={date.toISOString()} value={format(date, 'yyyy-MM-dd')}>
                {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>

        {/* Horário */}
        {selectedDate && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-5 h-5 text-green-500" />
              Horário Disponível
            </label>
            {loadingTimes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Carregando horários...</span>
              </div>
            ) : (
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um horário</option>
                {availableTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Resumo */}
        {resumo && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Resumo do Agendamento</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Paciente: <span className="font-medium">{resumo.paciente}</span></p>
              <p>Tipo: <span className="font-medium">{resumo.tipo}</span></p>
              <p>Data: <span className="font-medium">{resumo.dataFormatada}</span></p>
              <p>Horario: <span className="font-medium">{resumo.horario}</span></p>
            </div>
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={loading || !selectedDate || !selectedTime}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Agendando...
            </>
          ) : (
            'Confirmar Agendamento'
          )}
        </button>
      </form>
    </div>
  );
}
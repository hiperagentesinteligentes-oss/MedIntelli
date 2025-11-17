import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, Loader2, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFeriados } from '@/hooks/useFeriados';

export default function AgendamentosPage() {
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
  
  // Hook de feriados
  const { feriados, loading: loadingFeriados, verificarSeEHoleriado, obterFeriadosDoMes } = useFeriados();

  // Memoizar datas disponiveis para evitar recalculo
  const availableDates = useMemo(() => {
    const dates = [];
    let current = new Date();
    
    for (let i = 0; dates.length < 60; i++) {
      const next = addDays(current, i);
      const day = next.getDay();
      
      // Pular fins de semana e feriados
      if (day !== 0 && day !== 6 && !verificarSeEHoleriado(next)) {
        dates.push(next);
      }
    }
    
    return dates;
  }, [feriados, verificarSeEHoleriado]);

  // Carregar horarios disponiveis do RPC
  useEffect(() => {
    if (selectedDate) {
      loadAvailableTimes(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableTimes = useCallback(async (date: string) => {
    setLoadingTimes(true);
    setSelectedTime('');
    
    try {
      const { data, error } = await supabase
        .rpc('horarios_livres', { _dia: date });

      if (error) throw error;

      // Converter para formato HH:MM
      const times = data.map((slot: any) => {
        const inicio = new Date(slot.inicio);
        return format(inicio, 'HH:mm');
      });

      setAvailableTimes(times);
    } catch (error) {
      console.error('Erro ao carregar horarios:', error);
      // Fallback para horarios fixos se RPC falhar
      const times = [];
      for (let hour = 8; hour < 18; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setAvailableTimes(times);
    } finally {
      setLoadingTimes(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paciente || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos obrigatorios');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      // Criar data/hora completa
      const dataHora = `${selectedDate}T${selectedTime}:00`;

      const { error } = await supabase.from('agendamentos').insert({
        paciente_id: paciente.id,
        data_agendamento: dataHora,
        tipo_consulta: tipoConsulta || 'Consulta Medica',
        status: 'agendado',
        observacoes,
        paciente_nome: paciente.nome,
        paciente_telefone: paciente.telefone,
        origem_agendamento: 'app_paciente',
        confirmado_paciente: true,
        confirmado_clinica: false,
        primeira_consulta: false,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Limpar formulario
      setTimeout(() => {
        setSelectedDate('');
        setSelectedTime('');
        setTipoConsulta('');
        setObservacoes('');
        setSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Resumo memoizado
  const resumo = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    
    return {
      paciente: paciente?.nome,
      tipo: tipoConsulta || 'Nao selecionado',
      dataFormatada: format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      horario: selectedTime,
    };
  }, [selectedDate, selectedTime, tipoConsulta, paciente?.nome]);

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      {/* Header com Botao Voltar */}
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
          Escolha a data e horario para sua consulta
        </p>
      </div>

      {/* Info sobre Feriados */}
      {feriados.length > 0 && (
        <div className="m-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium mb-1">
              Feriados identificados no período:
            </p>
            <div className="text-amber-700 space-y-1">
              {feriados.slice(0, 3).map((feriado, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>{format(new Date(feriado.data), "dd 'de' MMMM", { locale: ptBR })}</span>
                  <span className="text-amber-600 font-medium">{feriado.nome}</span>
                </div>
              ))}
              {feriados.length > 3 && (
                <p className="text-xs text-amber-600 mt-2">
                  + {feriados.length - 3} feriados adicionais no período
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading de Feriados */}
      {loadingFeriados && (
        <div className="m-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Carregando feriados...</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="m-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Agendamento criado!</h3>
            <p className="text-sm text-green-700 mt-1">
              Sua consulta foi agendada com sucesso. Aguarde confirmacao da clinica.
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
            <option value="Receituario">Renovacao de Receita</option>
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
            {availableDates.map((date) => {
              const isFeriado = verificarSeEHoleriado(date);
              const feriadoInfo = feriados.find(f => 
                f.recorrente 
                  ? f.mes === date.getMonth() + 1 && f.dia_mes === date.getDate()
                  : f.data === format(date, 'yyyy-MM-dd')
              );
              
              return (
                <option key={date.toISOString()} value={format(date, 'yyyy-MM-dd')}>
                  {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  {isFeriado && feriadoInfo && ` - ${feriadoInfo.nome}`}
                </option>
              );
            })}
          </select>
          
          {/* Info sobre a data selecionada */}
          {selectedDate && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Data selecionada:</p>
              <p className="font-medium text-gray-900">
                {format(new Date(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              {verificarSeEHoleriado(new Date(selectedDate)) && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="text-red-800 font-medium">⚠️ Feriado não agendável</p>
                  <p className="text-red-600 text-xs mt-1">
                    Esta data não está disponível para agendamento devido a feriado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Horario */}
        {selectedDate && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-5 h-5 text-green-500" />
              Horario Disponivel
            </label>
            {loadingTimes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Carregando horarios...</span>
              </div>
            ) : availableTimes.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>Nenhum horario disponivel para esta data.</p>
                <p className="text-sm mt-1">Selecione outra data.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`px-3 py-2 rounded-lg border font-medium text-sm transition-all ${
                      selectedTime === time
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600 hover:shadow-sm'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Observacoes */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Observacoes (opcional)
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={4}
            placeholder="Descreva o motivo da consulta ou informacoes relevantes..."
          />
        </div>

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

        {/* Botao Submit */}
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

        {/* Info */}
        <div className="text-center text-sm text-gray-600">
          <p>Seu agendamento sera confirmado pela clinica</p>
          <p>Voce recebera uma notificacao em breve</p>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Feriado {
  id: string;
  data: string;
  nome: string;
  tipo: 'nacional' | 'municipal';
  mes: number;
  dia_mes: number;
  recorrente: boolean;
  permite_agendamento: boolean;
  descricao?: string;
}

export function useFeriados(periodoInicial: Date = new Date(), mesesAhead: number = 2) {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarFeriados = async () => {
    setLoading(true);
    setError(null);

    try {
      const dataInicio = startOfMonth(periodoInicial);
      const dataFim = endOfMonth(addMonths(periodoInicial, mesesAhead));

      // Executar consultas em paralelo para melhor performance
      const [feriadosEspecificosResult, feriadosRecorrentesResult] = await Promise.all([
        // Feriados específicos do período
        supabase
          .from('feriados')
          .select(`
            id,
            data,
            nome,
            tipo,
            mes,
            dia_mes,
            recorrente,
            permite_agendamento,
            descricao
          `)
          .eq('recorrente', false)
          .gte('data', format(dataInicio, 'yyyy-MM-dd'))
          .lte('data', format(dataFim, 'yyyy-MM-dd'))
          .order('data'),
        
        // Feriados recorrentes
        supabase
          .from('feriados')
          .select(`
            id,
            nome,
            tipo,
            mes,
            dia_mes,
            recorrente,
            permite_agendamento,
            descricao
          `)
          .eq('recorrente', true)
      ]);

      if (feriadosEspecificosResult.error) throw feriadosEspecificosResult.error;
      if (feriadosRecorrentesResult.error) throw feriadosRecorrentesResult.error;

      const feriadosDoPeriodo = [...(feriadosEspecificosResult.data || [])];

      // Adicionar feriados recorrentes que caem no período
      const feriadosRecorrentes = feriadosRecorrentesResult.data || [];
      const dataAtual = new Date(periodoInicial);
      
      for (let i = 0; i <= mesesAhead; i++) {
        const anoAtual = dataAtual.getFullYear();
        
        for (const feriado of feriadosRecorrentes) {
          if (feriado.mes && feriado.dia_mes) {
            const dataFeriado = new Date(
              anoAtual,
              feriado.mes - 1, // Mês é 1-based, Date é 0-based
              feriado.dia_mes
            );
            
            if (dataFeriado >= dataInicio && dataFeriado <= dataFim) {
              // Verificar se já não existe (evitar duplicatas)
              const existe = feriadosDoPeriodo.some(
                f => !f.recorrente && 
                     f.mes === feriado.mes && 
                     f.dia_mes === feriado.dia_mes &&
                     new Date(f.data).getFullYear() === anoAtual
              );
              
              if (!existe) {
                feriadosDoPeriodo.push({
                  ...feriado,
                  data: format(dataFeriado, 'yyyy-MM-dd')
                });
              }
            }
          }
        }
        
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }

      // Ordenar por data
      feriadosDoPeriodo.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      setFeriados(feriadosDoPeriodo);
    } catch (err) {
      console.error('Erro ao carregar feriados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar feriados');
    } finally {
      setLoading(false);
    }
  };

  const verificarSeEHoleriado = (data: Date): boolean => {
    const mes = data.getMonth() + 1; // Convertendo para 1-based
    const dia = data.getDate();
    
    return feriados.some(feriado => {
      if (feriado.recorrente) {
        return feriado.mes === mes && feriado.dia_mes === dia;
      } else {
        return format(data, 'yyyy-MM-dd') === feriado.data;
      }
    });
  };

  const obterFeriadosDoMes = (mes: number, ano: number): Feriado[] => {
    return feriados.filter(feriado => {
      if (feriado.recorrente) {
        return feriado.mes === mes;
      } else {
        const dataFeriado = new Date(feriado.data);
        return dataFeriado.getMonth() + 1 === mes && dataFeriado.getFullYear() === ano;
      }
    });
  };

  useEffect(() => {
    carregarFeriados();
  }, [periodoInicial, mesesAhead]);

  return {
    feriados,
    loading,
    error,
    carregarFeriados,
    verificarSeEHoleriado,
    obterFeriadosDoMes
  };
}
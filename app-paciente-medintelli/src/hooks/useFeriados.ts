import { useState, useEffect, useCallback } from 'react';
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
  
  console.log('🚀 Hook useFeriados inicializado:', {
    periodoInicial: periodoInicial.toISOString(),
    mesesAhead,
    loading,
    feriadosCount: feriados.length
  });

  const carregarFeriados = async () => {
    console.log('🔄 Iniciando carregamento de feriados...');
    setLoading(true);
    setError(null);

    try {
      const dataInicio = startOfMonth(periodoInicial);
      const dataFim = endOfMonth(addMonths(periodoInicial, mesesAhead));
      
      console.log('📅 Período de busca:', {
        dataInicio: format(dataInicio, 'yyyy-MM-dd'),
        dataFim: format(dataFim, 'yyyy-MM-dd')
      });

      console.log('🔍 Buscando feriados específicos e recorrentes...');
      
      // Timeout para cada query individual
      const queryTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query de feriados timeout')), 5000)
      );
      
      // Executar consultas em paralelo com timeout
      const [feriadosEspecificosResult, feriadosRecorrentesResult] = await Promise.all([
        // Feriados específicos do período
        supabase
          .from('feriados')
          .select('id,data,nome,tipo,mes,dia_mes,recorrente,permite_agendamento,descricao')
          .eq('recorrente', false)
          .gte('data', format(dataInicio, 'yyyy-MM-dd'))
          .lte('data', format(dataFim, 'yyyy-MM-dd'))
          .order('data'),
        
        // Feriados recorrentes
        supabase
          .from('feriados')
          .select('id,nome,tipo,mes,dia_mes,recorrente,permite_agendamento,descricao')
          .eq('recorrente', true)
      ]).catch(async () => {
        console.warn('⚠️ Falha na query principal, tentando query simplificada...');
        // Query simplificada como fallback
        const fallbackResult = await Promise.race([
          supabase.from('feriados').select('*'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback timeout')), 3000))
        ]);
        
        return [fallbackResult as any, { data: [], error: null }];
      });

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

      console.log('✅ Feriados carregados com sucesso:', {
        total: feriadosDoPeriodo.length,
        primeiro: feriadosDoPeriodo[0]?.nome,
        ultimo: feriadosDoPeriodo[feriadosDoPeriodo.length - 1]?.nome
      });
      
      setFeriados(feriadosDoPeriodo);
    } catch (err) {
      console.error('❌ Erro ao carregar feriados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar feriados');
      
      // FALLBACK: Retornar lista vazia em caso de erro para não bloquear a UI
      console.warn('🔄 Usando fallback - feriados vazios');
      setFeriados([]);
    } finally {
      setLoading(false);
      console.log('✅ Carregamento de feriados finalizado');
    }
  };
  
  // Timeout de segurança para evitar loading infinito
  const carregarFeriadosComTimeout = useCallback(async () => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao carregar feriados')), 10000)
    );
    
    const mainPromise = carregarFeriados();
    
    try {
      await Promise.race([mainPromise, timeoutPromise]);
    } catch (err) {
      console.error('❌ Timeout ou erro no carregamento:', err);
      setError('Timeout ao carregar feriados');
      setFeriados([]);
      setLoading(false);
    }
  }, []);

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
    console.log('📡 useEffect disparado para carregar feriados', {
      periodoInicial: periodoInicial.toISOString(),
      mesesAhead,
      dependencias: Object.keys({carregarFeriadosComTimeout})
    });
    
    // Executar apenas uma vez por montagem
    let ativo = true;
    const executar = async () => {
      if (ativo) {
        await carregarFeriadosComTimeout();
      }
    };
    
    executar();
    
    return () => {
      ativo = false;
    };
  }, []); // Removido dependências para evitar re-execuções

  return {
    feriados,
    loading,
    error,
    carregarFeriados,
    verificarSeEHoleriado,
    obterFeriadosDoMes
  };
}
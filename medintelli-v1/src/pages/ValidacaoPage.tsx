import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  ExternalLink,
  QrCode,
  Download,
  Save,
  CheckSquare
} from 'lucide-react';

interface Validacao {
  id: number;
  funcionalidade: string;
  etapa: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  testado_por: string | null;
  testado_em: string | null;
  observacoes: string | null;
}

export default function ValidacaoPage() {
  const [validacoes, setValidacoes] = useState<Validacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [editando, setEditando] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    status: string;
    testado_por: string;
    observacoes: string;
  }>({
    status: 'pendente',
    testado_por: '',
    observacoes: ''
  });

  useEffect(() => {
    loadValidacoes();
  }, []);

  const loadValidacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('validacoes_sistema')
        .select('*')
        .order('etapa', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setValidacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar validacoes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (validacao: Validacao) => {
    setEditando(validacao.id);
    setFormData({
      status: validacao.status,
      testado_por: validacao.testado_por || '',
      observacoes: validacao.observacoes || ''
    });
  };

  const handleSave = async (id: number) => {
    try {
      const { error } = await supabase
        .from('validacoes_sistema')
        .update({
          status: formData.status,
          testado_por: formData.testado_por,
          observacoes: formData.observacoes,
          testado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setEditando(null);
      loadValidacoes();
    } catch (error) {
      console.error('Erro ao salvar validacao:', error);
    }
  };

  const handleCancel = () => {
    setEditando(null);
    setFormData({
      status: 'pendente',
      testado_por: '',
      observacoes: ''
    });
  };

  const filteredValidacoes = validacoes.filter(v => {
    if (filtroEtapa !== 'todas' && v.etapa !== filtroEtapa) return false;
    if (filtroStatus !== 'todos' && v.status !== filtroStatus) return false;
    return true;
  });

  const estatisticas = {
    total: validacoes.length,
    aprovados: validacoes.filter(v => v.status === 'aprovado').length,
    reprovados: validacoes.filter(v => v.status === 'reprovado').length,
    pendentes: validacoes.filter(v => v.status === 'pendente').length,
    etapa1: validacoes.filter(v => v.etapa === '1').length,
    etapa2: validacoes.filter(v => v.etapa === '2').length,
    etapa1Aprovados: validacoes.filter(v => v.etapa === '1' && v.status === 'aprovado').length,
    etapa2Aprovados: validacoes.filter(v => v.etapa === '2' && v.status === 'aprovado').length,
  };

  const progressoEtapa1 = estatisticas.etapa1 > 0 
    ? Math.round((estatisticas.etapa1Aprovados / estatisticas.etapa1) * 100) 
    : 0;
  const progressoEtapa2 = estatisticas.etapa2 > 0 
    ? Math.round((estatisticas.etapa2Aprovados / estatisticas.etapa2) * 100) 
    : 0;
  const progressoGeral = estatisticas.total > 0 
    ? Math.round((estatisticas.aprovados / estatisticas.total) * 100) 
    : 0;

  const appPacienteUrl = 'https://yy5zzmwhuj5x.space.minimax.io';
  const sistemaPrincipalUrl = 'https://4h8zd4eexmas.space.minimax.io';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando validacoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Validacao do Sistema MedIntelli
          </h1>
          <p className="text-gray-600">
            Checklist completo de funcionalidades para validacao do cliente
          </p>
        </div>

        {/* Estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas.aprovados}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reprovados</p>
                <p className="text-2xl font-bold text-red-600">{estatisticas.reprovados}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{estatisticas.pendentes}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Progresso por Etapa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">1a Etapa</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${progressoEtapa1}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{progressoEtapa1}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {estatisticas.etapa1Aprovados} de {estatisticas.etapa1} completas
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">2a Etapa</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all" 
                    style={{ width: `${progressoEtapa2}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{progressoEtapa2}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {estatisticas.etapa2Aprovados} de {estatisticas.etapa2} completas
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Progresso Geral</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all" 
                    style={{ width: `${progressoGeral}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{progressoGeral}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {estatisticas.aprovados} de {estatisticas.total} completas
            </p>
          </div>
        </div>

        {/* App Paciente QR Code */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">App Paciente</h3>
              <p className="text-blue-100 mb-4">Escaneie o QR Code ou acesse o link para testar</p>
              <a 
                href={appPacienteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir App Paciente
              </a>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-blue-600 rounded">
                <QrCode className="w-20 h-20 text-blue-600" />
                <p className="text-xs text-blue-600 text-center mt-1 font-semibold">QR CODE</p>
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">Aponta para:</p>
              <p className="text-xs text-gray-800 text-center font-medium break-all">{appPacienteUrl}</p>
            </div>
          </div>
        </div>

        {/* Sistema Principal QR Code */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Sistema Principal MedIntelli</h3>
              <p className="text-green-100 mb-4">Versão Final - Todas as 13 funcionalidades ativas</p>
              <a 
                href={sistemaPrincipalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Sistema Principal
              </a>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-green-600 rounded">
                <QrCode className="w-20 h-20 text-green-600" />
                <p className="text-xs text-green-600 text-center mt-1 font-semibold">QR CODE</p>
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">Aponta para:</p>
              <p className="text-xs text-gray-800 text-center font-medium break-all">{sistemaPrincipalUrl}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etapa
              </label>
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todas">Todas</option>
                <option value="1">1a Etapa</option>
                <option value="2">2a Etapa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovado">Aprovados</option>
                <option value="reprovado">Reprovados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Validacoes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Funcionalidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Testado Por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Observacoes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredValidacoes.map((validacao) => (
                  <tr key={validacao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        validacao.etapa === '1' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {validacao.etapa === '1' ? '1a Etapa' : '2a Etapa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{validacao.funcionalidade}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editando === validacao.id ? (
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="px-3 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="reprovado">Reprovado</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${
                          validacao.status === 'aprovado' 
                            ? 'bg-green-100 text-green-800' 
                            : validacao.status === 'reprovado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {validacao.status === 'aprovado' && <CheckCircle2 className="w-3 h-3" />}
                          {validacao.status === 'reprovado' && <XCircle className="w-3 h-3" />}
                          {validacao.status === 'pendente' && <Clock className="w-3 h-3" />}
                          {validacao.status === 'aprovado' ? 'Aprovado' : validacao.status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editando === validacao.id ? (
                        <input
                          type="text"
                          value={formData.testado_por}
                          onChange={(e) => setFormData({ ...formData, testado_por: e.target.value })}
                          placeholder="Nome do testador"
                          className="px-3 py-1 text-sm border border-gray-300 rounded w-full"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{validacao.testado_por || '-'}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editando === validacao.id ? (
                        <textarea
                          value={formData.observacoes}
                          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                          placeholder="Observacoes ou sugestoes"
                          rows={2}
                          className="px-3 py-2 text-sm border border-gray-300 rounded w-full"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{validacao.observacoes || '-'}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editando === validacao.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(validacao.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            <Save className="w-4 h-4" />
                            Salvar
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(validacao)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredValidacoes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma validacao encontrada com os filtros selecionados</p>
          </div>
        )}
      </div>
    </div>
  );
}

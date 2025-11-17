import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  QrCode,
  Save,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Validacao {
  id: number;
  funcionalidade: string;
  etapa: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  testado_por: string | null;
  testado_em: string | null;
  observacoes: string | null;
}

export default function ValidacaoPublicaPage() {
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
          testado_por: formData.testado_por || null,
          observacoes: formData.observacoes || null,
          testado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadValidacoes();
      setEditando(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar validacao');
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

  const validacoesFiltradas = validacoes.filter(v => {
    const matchEtapa = filtroEtapa === 'todas' || v.etapa === filtroEtapa;
    const matchStatus = filtroStatus === 'todos' || v.status === filtroStatus;
    return matchEtapa && matchStatus;
  });

  const estatisticas = {
    total: validacoes.length,
    aprovados: validacoes.filter(v => v.status === 'aprovado').length,
    reprovados: validacoes.filter(v => v.status === 'reprovado').length,
    pendentes: validacoes.filter(v => v.status === 'pendente').length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'reprovado':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: 'bg-yellow-100 text-yellow-800',
      aprovado: 'bg-green-100 text-green-800',
      reprovado: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando validacoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Validacao MedIntelli</h1>
              <p className="text-gray-600 mt-1">Checklist de funcionalidades do sistema</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://tnrqipvbgkue.space.minimax.io/login"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Acessar Sistema Principal
              </a>
            </div>
          </div>

          {/* Estatisticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{estatisticas.total}</div>
              <div className="text-sm text-gray-600">Total de Itens</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{estatisticas.aprovados}</div>
              <div className="text-sm text-gray-600">Aprovados</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{estatisticas.reprovados}</div>
              <div className="text-sm text-gray-600">Reprovados</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.pendentes}</div>
              <div className="text-sm text-gray-600">Pendentes</div>
            </div>
          </div>
        </div>

        {/* QR Code App Paciente */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            App Paciente
          </h2>
          <div className="flex items-center gap-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <QRCodeSVG
                value="https://qvptzhny0jw9.space.minimax.io"
                size={128}
                level="M"
              />
            </div>
            <div>
              <p className="text-gray-700 mb-2">
                Escaneie o QR Code para acessar o App Paciente
              </p>
              <a
                href="https://qvptzhny0jw9.space.minimax.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                https://qvptzhny0jw9.space.minimax.io
              </a>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todas">Todas as Etapas</option>
              <option value="1">Etapa 1</option>
              <option value="2">Etapa 2</option>
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovados</option>
              <option value="reprovado">Reprovados</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              {validacoesFiltradas.length} itens encontrados
            </div>
          </div>
        </div>

        {/* Lista de Validacoes */}
        <div className="space-y-4">
          {['1', '2'].map(etapa => {
            const itensEtapa = validacoesFiltradas.filter(v => v.etapa === etapa);
            if (itensEtapa.length === 0) return null;

            return (
              <div key={etapa} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-3">
                  <h3 className="text-lg font-semibold">
                    Etapa {etapa} - {itensEtapa.length} itens
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {itensEtapa.map(validacao => (
                    <div key={validacao.id} className="p-4 hover:bg-gray-50 transition-colors">
                      {editando === validacao.id ? (
                        // Modo Edicao
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{validacao.funcionalidade}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSave(validacao.id)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                title="Salvar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="reprovado">Reprovado</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Testado Por
                              </label>
                              <input
                                type="text"
                                value={formData.testado_por}
                                onChange={(e) => setFormData({ ...formData, testado_por: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Nome do testador"
                              />
                            </div>
                            <div className="col-span-1"></div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Observacoes
                            </label>
                            <textarea
                              value={formData.observacoes}
                              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              placeholder="Observacoes sobre o teste..."
                            />
                          </div>
                        </div>
                      ) : (
                        // Modo Visualizacao
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(validacao.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{validacao.funcionalidade}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(validacao.status)}`}>
                                {validacao.status.charAt(0).toUpperCase() + validacao.status.slice(1)}
                              </span>
                            </div>
                            {validacao.testado_por && (
                              <p className="text-sm text-gray-600 mb-1">
                                Testado por: <span className="font-medium">{validacao.testado_por}</span>
                                {validacao.testado_em && (
                                  <span className="ml-2 text-gray-500">
                                    em {new Date(validacao.testado_em).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </p>
                            )}
                            {validacao.observacoes && (
                              <p className="text-sm text-gray-600 italic">
                                {validacao.observacoes}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => handleEdit(validacao)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {validacoesFiltradas.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum item encontrado com os filtros selecionados</p>
          </div>
        )}

        {/* Credenciais de Teste */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Credenciais de Teste - Sistema Principal
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">Alencar (Admin)</p>
              <p className="text-sm text-gray-600">alencar@medintelli.com.br / senha123</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">Silvia (Admin)</p>
              <p className="text-sm text-gray-600">silvia@medintelli.com.br / senha123</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">Natashia (Secretaria)</p>
              <p className="text-sm text-gray-600">natashia@medintelli.com.br / senha123</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">Dr. Francisco (Medico)</p>
              <p className="text-sm text-gray-600">drfrancisco@medintelli.com.br / senha123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

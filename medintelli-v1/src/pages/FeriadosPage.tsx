import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase, FUNCTION_URL } from '@/lib/supabase';
import { Feriado } from '@/types';
import Layout from '@/components/Layout';
import { Sun, Plus, RefreshCw, Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FeriadosPage() {
  const { session } = useAuth();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [formData, setFormData] = useState({
    data: '',
    nome: '',
    tipo: 'nacional' as 'nacional' | 'municipal' | 'estadual',
    municipio: '',
    descricao: '',
    recorrente: false,
    mes: '',
    dia_mes: '',
  });

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        setLoading(true);
        try {
          await loadFeriados();
        } catch (error) {
          console.error('Erro ao carregar feriados:', error);
          // PATCH PACK V3: Toast notification could be added here
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []); // PATCH PACK V3: useEffect sem dependências para evitar loops infinitos

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const validateDateConflict = (data: string, nome: string, excludeId?: string) => {
    const existing = feriados.find(f => 
      f.data === data && f.nome.toLowerCase() === nome.toLowerCase() && f.id !== excludeId
    );
    return existing;
  };

  const loadFeriados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feriados')
        .select('*')
        .order('data', { ascending: true });

      if (error) throw error;
      setFeriados(data || []);
    } catch (error) {
      console.error('Erro ao carregar feriados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFeriados = async () => {
    if (!session) {
      showNotification('error', 'Usuário não autenticado');
      return;
    }
    setSyncing(true);

    try {
      const response = await fetch(`${FUNCTION_URL}/feriados-sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Erro ao sincronizar feriados');
      }

      const result = await response.json();
      showNotification('success', 
        `✅ Sincronização concluída!\n\n📊 Relatório:\n• ${result.data.created} feriados criados\n• ${result.data.updated} feriados atualizados\n\nOs feriados agora estão destacados na agenda.`
      );
      await loadFeriados();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      showNotification('error', `Erro ao sincronizar feriados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      showNotification('error', 'Usuário não autenticado');
      return;
    }

    // Validações
    if (!formData.data || !formData.nome) {
      showNotification('error', 'Data e nome são obrigatórios');
      return;
    }

    if (formData.recorrente && (!formData.mes || !formData.dia_mes)) {
      showNotification('error', 'Para feriados recorrentes, mês e dia do mês são obrigatórios');
      return;
    }

    // Verificar conflitos
    const conflict = validateDateConflict(formData.data, formData.nome, editingId || undefined);
    if (conflict) {
      showNotification('error', 'Já existe um feriado com essa data e nome');
      return;
    }

    try {
      const url = editingId 
        ? `${FUNCTION_URL}/feriados-sync?id=${editingId}`
        : `${FUNCTION_URL}/feriados-sync`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Erro ao salvar feriado');
      }

      showNotification('success', editingId ? 'Feriado atualizado com sucesso!' : 'Feriado adicionado com sucesso!');
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        data: '',
        nome: '',
        tipo: 'nacional',
        municipio: '',
        descricao: '',
        recorrente: false,
        mes: '',
        dia_mes: '',
      });
      await loadFeriados();
    } catch (error) {
      console.error('Erro ao salvar feriado:', error);
      showNotification('error', `Erro ao salvar feriado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleEdit = (feriado: Feriado) => {
    setEditingId(feriado.id);
    setFormData({
      data: feriado.data,
      nome: feriado.nome,
      tipo: feriado.tipo,
      municipio: feriado.municipio || '',
      descricao: feriado.descricao || '',
      recorrente: false, // Será implementado futuramente
      mes: '',
      dia_mes: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (feriado: Feriado) => {
    if (!session) {
      showNotification('error', 'Usuário não autenticado');
      return;
    }

    if (feriado.tipo === 'nacional') {
      showNotification('error', 'Feriados nacionais não podem ser deletados');
      return;
    }

    setDeletingId(feriado.id);
    
    try {
      const response = await fetch(`${FUNCTION_URL}/feriados-sync?id=${feriado.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Erro ao deletar feriado');
      }

      showNotification('success', 'Feriado removido com sucesso!');
      await loadFeriados();
    } catch (error) {
      console.error('Erro ao deletar feriado:', error);
      showNotification('error', `Erro ao deletar feriado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      data: '',
      nome: '',
      tipo: 'nacional',
      municipio: '',
      descricao: '',
      recorrente: false,
      mes: '',
      dia_mes: '',
    });
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'nacional': return 'bg-blue-100 text-blue-800';
      case 'estadual': return 'bg-green-100 text-green-800';
      case 'municipal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' && <Check className="w-5 h-5 mr-2" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 mr-2" />}
              {notification.type === 'info' && <AlertTriangle className="w-5 h-5 mr-2" />}
              <span className="whitespace-pre-line">{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Sun className="w-7 h-7" />
            <span>Feriados</span>
          </h1>

          <div className="flex items-center space-x-3">
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Cancelar Edição</span>
              </button>
            )}
            
            <button
              onClick={handleSyncFeriados}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar Automático'}</span>
            </button>

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{editingId ? 'Continuar Edição' : 'Adicionar Manual'}</span>
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Editar Feriado' : 'Adicionar Feriado Manual'}
            </h2>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Destaque na Agenda:</strong> Os feriados adicionados serão automaticamente destacados 
                na agenda do sistema, sendo mostrados com uma marcação especial nas datas correspondentes.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Feriado</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={editingId && formData.tipo === 'nacional'}
                  >
                    <option value="nacional">Nacional</option>
                    <option value="estadual">Estadual</option>
                    <option value="municipal">Municipal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Município (se aplicável)</label>
                  <input
                    type="text"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Checkbox para feriado recorrente */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="recorrente"
                  checked={formData.recorrente}
                  onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="recorrente" className="text-sm font-medium text-gray-700">
                  Feriado Recorrente (ocorre todo ano na mesma data)
                </label>
              </div>

              {/* Campos para definição de mês e dia do mês (quando recorrente) */}
              {formData.recorrente && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
                    <select
                      value={formData.mes}
                      onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Selecione o mês</option>
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dia do Mês</label>
                    <select
                      value={formData.dia_mes}
                      onChange={(e) => setFormData({ ...formData, dia_mes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Selecione o dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-2 text-xs text-yellow-800">
                    ℹ️ O feriado será aplicado automaticamente todos os anos na data definida.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {editingId ? 'Cancelar' : 'Fechar'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Carregando feriados...
            </div>
          ) : feriados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Sun className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-600 mb-1">Nenhum feriado cadastrado</p>
              <p className="text-sm text-gray-500 mb-3">
                Use "Sincronizar Automático" para buscar feriados nacionais ou adicione manualmente.
              </p>
              <p className="text-xs text-gray-400">
                Os feriados serão destacados automaticamente na agenda quando adicionados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {feriados.map((feriado) => (
                <div key={feriado.id} className="p-4 hover:bg-gray-50">
                  {showDeleteConfirm === feriado.id ? (
                    // Modo confirmação de exclusão
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-red-900">Confirmar Exclusão</h3>
                          <p className="text-sm text-red-700 mt-1">
                            Tem certeza que deseja remover o feriado "{feriado.nome}"?
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            Esta ação não pode ser desfeita.
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                            disabled={deletingId === feriado.id}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleDelete(feriado)}
                            disabled={deletingId === feriado.id}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1"
                          >
                            {deletingId === feriado.id ? (
                              <>
                                <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                                <span>Removendo...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>Remover</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Modo normal de visualização/edição
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {format(new Date(feriado.data), 'dd')}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            {format(new Date(feriado.data), 'MMM', { locale: ptBR })}
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{feriado.nome}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${getTipoColor(feriado.tipo)}`}>
                              {feriado.tipo}
                            </span>
                            {feriado.municipio && (
                              <span className="text-xs text-gray-500">{feriado.municipio}</span>
                            )}
                          </div>
                          {feriado.descricao && (
                            <p className="text-sm text-gray-600 mt-1">{feriado.descricao}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          feriado.permite_agendamento ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {feriado.permite_agendamento ? 'Permite agendamento' : 'Sem agendamento'}
                        </span>

                        {/* Botões de ação */}
                        <div className="flex items-center space-x-1">
                          {feriado.tipo !== 'nacional' && (
                            <>
                              <button
                                onClick={() => handleEdit(feriado)}
                                disabled={editingId === feriado.id || deletingId === feriado.id}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
                                title="Editar feriado"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(feriado.id)}
                                disabled={editingId === feriado.id || deletingId === feriado.id}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Remover feriado"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

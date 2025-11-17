import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FilaEspera } from '@/types';
import Layout from '@/components/Layout';
import { Users, Plus, X, CheckCircle, Edit2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ITEMS_PER_PAGE = 15;

export default function FilaEsperaPage() {
  const { session } = useAuth();
  const [fila, setFila] = useState<FilaEspera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [agendarItem, setAgendarItem] = useState<FilaEspera | null>(null);
  const [sugestoesHorarios, setSugestoesHorarios] = useState<any[]>([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [editingItem, setEditingItem] = useState<FilaEspera | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modoFila, setModoFila] = useState<'chegada' | 'prioridade'>('chegada');
  const [draggedItem, setDraggedItem] = useState<FilaEspera | null>(null);
  const [showQuickPatientForm, setShowQuickPatientForm] = useState(false);
  const [quickPatientData, setQuickPatientData] = useState({
    nome: '',
    telefone: '',
    email: '',
  });
  const [formData, setFormData] = useState({
    nome_paciente: '',
    telefone: '',
    tipo_consulta: '',
    urgencia_detectada: 'media',
    condicao_medica: '',
    observacoes: '',
  });
  const [editFormData, setEditFormData] = useState({
    urgencia_detectada: 'media',
    condicao_medica: '',
    observacoes: '',
    tipo_consulta: '',
  });
  const [saving, setSaving] = useState(false);
  const [ordenacaoManual, setOrdenacaoManual] = useState<{[key: string]: number}>({});

  useEffect(() => {
    loadFila();
  }, [modoFila]);
  
  // PATCH V4: Atualizar ordenacao quando fila mudar
  useEffect(() => {
    const novaOrdenacao: {[key: string]: number} = {};
    fila.forEach((item, index) => {
      novaOrdenacao[item.id] = index + 1;
    });
    setOrdenacaoManual(novaOrdenacao);
  }, [fila]);

  const loadFila = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fila-espera?status=aguardando`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar fila de espera');

      const data = await response.json();
      const sortedFila = (data.data || []).sort((a: FilaEspera, b: FilaEspera) => 
        (a.pos || a.posicao_atual || 0) - (b.pos || b.posicao_atual || 0)
      );
      setFila(sortedFila);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const response = await fetch(`/api/fila-espera`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erro ao adicionar à fila');

      setShowForm(false);
      setFormData({
        nome_paciente: '',
        telefone: '',
        tipo_consulta: '',
        urgencia_detectada: 'media',
        condicao_medica: '',
        observacoes: '',
      });
      loadFila();
    } catch (error) {
      console.error('Erro ao adicionar à fila:', error);
      alert('Erro ao adicionar à fila de espera');
    }
  };

  const handleEdit = (item: FilaEspera) => {
    setEditingItem(item);
    setEditFormData({
      urgencia_detectada: item.urgencia_detectada || 'media',
      condicao_medica: item.condicao_medica || '',
      observacoes: item.observacoes || '',
      tipo_consulta: item.tipo_consulta || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!session || !editingItem) return;

    try {
      const response = await fetch(`/api/fila-espera`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingItem.id,
          ...editFormData,
        }),
      });

      if (!response.ok) throw new Error('Erro ao editar item');

      setShowEditModal(false);
      setEditingItem(null);
      loadFila();
    } catch (error) {
      console.error('Erro ao editar:', error);
      alert('Erro ao editar item da fila');
    }
  };

  const handleMoveUp = async (item: FilaEspera, index: number) => {
    if (!session || index === 0) return;

    const newPosition = (fila[index - 1].pos || fila[index - 1].posicao_atual || 0);
    
    try {
      const response = await fetch(`/api/fila-espera`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          nova_posicao: newPosition,
        }),
      });

      if (!response.ok) throw new Error('Erro ao reordenar');
      loadFila();
    } catch (error) {
      console.error('Erro ao mover para cima:', error);
      alert('Erro ao reordenar fila');
    }
  };

  const handleMoveDown = async (item: FilaEspera, index: number) => {
    if (!session || index === fila.length - 1) return;

    const newPosition = (fila[index + 1].pos || fila[index + 1].posicao_atual || 0);
    
    try {
      const response = await fetch(`/api/fila-espera`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          nova_posicao: newPosition,
        }),
      });

      if (!response.ok) throw new Error('Erro ao reordenar');
      loadFila();
    } catch (error) {
      console.error('Erro ao mover para baixo:', error);
      alert('Erro ao reordenar fila');
    }
  };

  // PATCH PACK V3: Funções de Drag and Drop
  const handleDragStart = (e: React.DragEvent, item: FilaEspera) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetItem: FilaEspera) => {
    e.preventDefault();
    if (!session || !draggedItem || draggedItem.id === targetItem.id) return;

    const draggedIndex = fila.findIndex(item => item.id === draggedItem.id);
    const targetIndex = fila.findIndex(item => item.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Calcular nova posição baseada no item de destino
    const targetPosition = targetItem.pos || targetItem.posicao_atual || 0;
    
    // Criar nova ordem na memória
    const newFila = [...fila];
    const draggedItemData = newFila[draggedIndex];
    newFila.splice(draggedIndex, 1);
    newFila.splice(targetIndex, 0, draggedItemData);

    // Atualizar interface imediatamente
    setFila(newFila);

    // Salvar nova ordem no backend
    try {
      const response = await fetch(`/api/fila-espera`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: draggedItem.id,
          nova_posicao: targetPosition,
          reordenar_todos: true,
          nova_ordem: newFila.map((item, index) => ({
            id: item.id,
            posicao: index + 1
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao reordenar');
      }
      
      loadFila(); // Recarregar para garantir consistência
    } catch (error) {
      console.error('Erro ao reordenar com DnD:', error);
      alert('Erro ao reordenar fila');
      loadFila(); // Recarregar em caso de erro
    }

    setDraggedItem(null);
  };

  // PATCH PACK V3: Cadastro rápido de paciente
  const handleQuickPatientCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const response = await fetch('/api/pacientes-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: quickPatientData.nome,
          telefone: quickPatientData.telefone,
          email: quickPatientData.email,
          ativo: true,
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar paciente');

      alert('Paciente criado com sucesso!');
      setShowQuickPatientForm(false);
      setQuickPatientData({ nome: '', telefone: '', email: '' });
      
      // Recarregar a lista de pacientes se necessário
      loadFila();
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      alert('Erro ao criar paciente');
    }
  };

  // PATCH PACK ITEM 3.6: DELETE funcional
  const handleRemover = async (id: string) => {
    if (!session) return;
    if (!confirm('Deseja realmente REMOVER este paciente da fila? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetch(`/api/fila-espera?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Erro ao remover paciente');
      
      alert('Paciente removido da fila com sucesso');
      loadFila();
    } catch (error) {
      console.error('Erro ao remover:', error);
      alert('Erro ao remover da fila');
    }
  };

  // PATCH PACK ITEM 3.6: Agendar com 3 sugestões
  const handleAgendar = async (item: FilaEspera) => {
    setAgendarItem(item);
    setShowAgendarModal(true);
    setDataSelecionada('');
    setSugestoesHorarios([]);
  };

  const buscarSugestoes = async () => {
    if (!session || !dataSelecionada) return;

    setLoadingSugestoes(true);
    try {
      const response = await fetch('/api/agendamentos', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sugerir: true,
          dia: dataSelecionada,
        }),
      });

      if (!response.ok) throw new Error('Erro ao buscar sugestões');

      const data = await response.json();
      setSugestoesHorarios(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      alert('Erro ao buscar horários disponíveis');
    } finally {
      setLoadingSugestoes(false);
    }
  };

  const confirmarAgendamento = async (horario: any) => {
    if (!session || !agendarItem) return;

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paciente_id: agendarItem.paciente_id,
          data_agendamento: horario.inicio,
          duracao_minutos: 30,
          tipo_consulta: agendarItem.tipo_consulta,
          observacoes: agendarItem.observacoes,
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar agendamento');

      alert('Agendamento criado com sucesso!');
      setShowAgendarModal(false);
      setAgendarItem(null);
      loadFila();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      alert('Erro ao criar agendamento');
    }
  };

  const getPrioridadeColor = (urgencia?: string) => {
    switch (urgencia) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-300';
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'baixa': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Users className="w-7 h-7" />
              <span>Fila de Espera</span>
              {saving && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
            </h1>
            
            {/* PATCH V4: Seletor de Modo e Informações de Ordenação */}
            <div className="mt-2 flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Organização
                </label>
                <select
                  value={modoFila}
                  onChange={(e) => setModoFila(e.target.value as 'chegada' | 'prioridade')}
                  disabled={saving}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                >
                  <option value="chegada">Ordem de Chegada</option>
                  <option value="prioridade">Por Prioridade</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Reordenação:</span>
                <span className="text-sm font-medium text-blue-600">
                  {Object.keys(ordenacaoManual).length > 0 ? 'Manual' : 'Automática'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar à Fila</span>
          </button>
        </div>

        {/* PATCH V4: Alertas de Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Erro</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Adicionar Paciente à Fila</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Paciente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_paciente}
                    onChange={(e) => setFormData({ ...formData, nome_paciente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Consulta
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tipo_consulta}
                    onChange={(e) => setFormData({ ...formData, tipo_consulta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={formData.urgencia_detectada}
                    onChange={(e) => setFormData({ ...formData, urgencia_detectada: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condição Médica
                </label>
                <input
                  type="text"
                  value={formData.condicao_medica}
                  onChange={(e) => setFormData({ ...formData, condicao_medica: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Total na fila: <span className="font-semibold">{fila.length}</span> paciente(s)
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">
                  Modo: <span className="font-medium">{modoFila === 'chegada' ? 'Chegada' : 'Prioridade'}</span>
                </span>
                {Object.keys(ordenacaoManual).length > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Ordenação Manual Ativa
                  </span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Carregando fila de espera...</span>
              </div>
            </div>
          ) : fila.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>Nenhum paciente na fila de espera</p>
              <p className="text-sm text-gray-400 mt-1">
                {modoFila === 'chegada' ? 'Aguardando pacientes por ordem de chegada' : 'Aguardando pacientes por prioridade'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {fila
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((item, displayIndex) => {
                    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + displayIndex;
                    return (
                      <div 
                        key={item.id} 
                        className="p-4 hover:bg-gray-50 transition-colors cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex flex-col items-center space-y-1">
                              <button
                                onClick={() => handleMoveUp(item, actualIndex)}
                                disabled={actualIndex === 0}
                                className={`p-1 rounded ${
                                  actualIndex === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Mover para cima"
                              >
                                <ChevronUp className="w-5 h-5" />
                              </button>
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-bold">
                                {actualIndex + 1}
                              </div>
                              <button
                                onClick={() => handleMoveDown(item, actualIndex)}
                                disabled={actualIndex === fila.length - 1}
                                className={`p-1 rounded ${
                                  actualIndex === fila.length - 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Mover para baixo"
                              >
                                <ChevronDown className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{item.nome_paciente}</h3>
                              <p className="text-sm text-gray-600">{item.telefone}</p>
                              
                              {/* PATCH V4: Informações do paciente via JOIN */}
                              {item.paciente_id && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                    ID: {item.paciente_id.substring(0, 8)}...
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-3 mt-2">
                                <span className="text-sm text-gray-600">{item.tipo_consulta}</span>
                                <span className={`text-xs px-2 py-1 rounded border ${getPrioridadeColor(item.urgencia_detectada)}`}>
                                  {item.urgencia_detectada}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Score: {item.score_prioridade}
                                </span>
                                <span className="text-xs text-blue-600 font-medium">
                                  {saving ? 'Salvando...' : 'Arraste para reorder'}
                                </span>
                              </div>
                              
                              {/* PATCH V4: Posição e ordenação manual */}
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-500">
                                  Posição: {ordenacaoManual[item.id] || item.pos || item.posicao_atual || 1}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {modoFila === 'chegada' ? 'Ordem de Chegada' : 'Por Prioridade'}
                                </span>
                              </div>
                              
                              {item.condicao_medica && (
                                <p className="text-sm text-gray-600 mt-1">Condição: {item.condicao_medica}</p>
                              )}
                              {item.observacoes && (
                                <p className="text-sm text-gray-500 italic mt-1">{item.observacoes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              disabled={saving}
                              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleAgendar(item)}
                              disabled={saving}
                              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                              title="Agendar consulta"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>Agendar</span>
                            </button>
                            <button
                              onClick={() => handleRemover(item.id)}
                              disabled={saving}
                              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
                              title="Remover da fila"
                            >
                              <X className="w-4 h-4" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Pagination */}
              {fila.length > ITEMS_PER_PAGE && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(fila.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(fila.length / ITEMS_PER_PAGE)}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> até{' '}
                        <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, fila.length)}</span> de{' '}
                        <span className="font-medium">{fila.length}</span> pacientes
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
                          Página {currentPage} de {Math.ceil(fila.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(fila.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage === Math.ceil(fila.length / ITEMS_PER_PAGE)}
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
      </div>

      {/* Modal de Edição */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Editar: {editingItem.nome_paciente}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Consulta
                </label>
                <input
                  type="text"
                  value={editFormData.tipo_consulta}
                  onChange={(e) => setEditFormData({ ...editFormData, tipo_consulta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={editFormData.urgencia_detectada}
                  onChange={(e) => setEditFormData({ ...editFormData, urgencia_detectada: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condição Médica
                </label>
                <input
                  type="text"
                  value={editFormData.condicao_medica}
                  onChange={(e) => setEditFormData({ ...editFormData, condicao_medica: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={editFormData.observacoes}
                  onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamento com 3 Sugestões */}
      {showAgendarModal && agendarItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Agendar: {agendarItem.nome_paciente}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione a Data
                </label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {dataSelecionada && (
                <button
                  onClick={buscarSugestoes}
                  disabled={loadingSugestoes}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingSugestoes ? 'Buscando...' : 'Buscar Horários Disponíveis'}
                </button>
              )}

              {sugestoesHorarios.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {sugestoesHorarios.length} horário(s) disponível(is):
                  </h3>
                  <div className="space-y-2">
                    {sugestoesHorarios.map((horario, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(horario.inicio), 'HH:mm', { locale: ptBR })} -{' '}
                              {format(new Date(horario.fim), 'HH:mm', { locale: ptBR })}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(horario.inicio), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => confirmarAgendamento(horario)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Confirmar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dataSelecionada && !loadingSugestoes && sugestoesHorarios.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum horário disponível para esta data. Tente outra data.
                </div>
              )}

              {/* PATCH PACK V3: Cadastro rápido de paciente se não existir */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Não encontrou o paciente?
                </p>
                <button
                  onClick={() => setShowQuickPatientForm(true)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Cadastrar Paciente Rapidamente
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button
                onClick={() => {
                  setShowAgendarModal(false);
                  setAgendarItem(null);
                  setDataSelecionada('');
                  setSugestoesHorarios([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATCH PACK V3: Modal de Cadastro Rápido de Paciente */}
      {showQuickPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Cadastro Rápido de Paciente
            </h2>

            <form onSubmit={handleQuickPatientCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Paciente
                </label>
                <input
                  type="text"
                  required
                  value={quickPatientData.nome}
                  onChange={(e) => setQuickPatientData({ ...quickPatientData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  required
                  value={quickPatientData.telefone}
                  onChange={(e) => setQuickPatientData({ ...quickPatientData, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={quickPatientData.email}
                  onChange={(e) => setQuickPatientData({ ...quickPatientData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickPatientForm(false);
                    setQuickPatientData({ nome: '', telefone: '', email: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

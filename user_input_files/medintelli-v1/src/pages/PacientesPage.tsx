import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Paciente } from '@/types';
import Layout from '@/components/Layout';
import { Users, Search, Plus, Edit, Trash2, Power, PowerOff, X, Save } from 'lucide-react';

const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/pacientes-manager';

const CONVENIOS_PERMITIDOS = ['PARTICULAR', 'UNIMED', 'UNIMED UNIFACIL', 'CASSI', 'CABESP'];

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [formData, setFormData] = useState<Partial<Paciente>>({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        setLoading(true);
        try {
          await loadPacientes();
        } catch (error) {
          console.error('Erro ao carregar pacientes:', error);
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

  const loadPacientes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessao expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.data) {
        setPacientes(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      // Em caso de erro, manter a lista atual
    }
  };

  const handleCreatePaciente = () => {
    setModalMode('create');
    setFormData({
      ativo: true,
    });
    setShowModal(true);
  };

  const handleEditPaciente = (paciente: Paciente) => {
    setModalMode('edit');
    setSelectedPaciente(paciente);
    setFormData({ ...paciente });
    setShowModal(true);
  };

  const handleSavePaciente = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessao expirada');
      }

      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const body = modalMode === 'create' ? formData : { id: selectedPaciente?.id, ...formData };

      const response = await fetch(FUNCTION_URL, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Erro: ${result.error}`);
      } else {
        alert(modalMode === 'create' ? 'Paciente criado com sucesso!' : 'Paciente atualizado com sucesso!');
        setShowModal(false);
        loadPacientes();
      }
    } catch (error: any) {
      alert(`Erro ao salvar paciente: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAtivo = async (paciente: Paciente) => {
    const novoStatus = !paciente.ativo;
    const confirmacao = confirm(
      `Deseja ${novoStatus ? 'ativar' : 'inativar'} o paciente ${paciente.nome}?`
    );

    if (!confirmacao) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessao expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: paciente.id,
          ativo: novoStatus,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Erro: ${result.error}`);
      } else {
        alert(`Paciente ${novoStatus ? 'ativado' : 'inativado'} com sucesso!`);
        loadPacientes();
      }
    } catch (error: any) {
      alert(`Erro ao alterar status: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePaciente = async (paciente: Paciente) => {
    const confirmacao = confirm(
      `ATENCAO: Deseja realmente EXCLUIR o paciente ${paciente.nome}? Esta acao nao pode ser desfeita.`
    );

    if (!confirmacao) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessao expirada');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: paciente.id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Erro: ${result.error}`);
      } else {
        alert('Paciente excluido com sucesso!');
        loadPacientes();
      }
    } catch (error: any) {
      alert(`Erro ao excluir paciente: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPacientes = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefone?.includes(searchTerm) ||
    p.cpf?.includes(searchTerm) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="w-7 h-7" />
            <span>Pacientes</span>
          </h1>
          <button
            onClick={handleCreatePaciente}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Paciente</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Total de pacientes: <span className="font-semibold">{filteredPacientes.length}</span>
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando pacientes...</div>
          ) : filteredPacientes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum paciente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Convenio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPacientes.map((paciente) => (
                    <tr key={paciente.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          paciente.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {paciente.ativo ? '🟢 Ativo' : '🔴 Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{paciente.nome}</td>
                      <td className="px-4 py-3 text-gray-600">{paciente.telefone || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{paciente.email || '-'}</td>
                      <td className="px-4 py-3">
                        {paciente.convenio ? (
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              paciente.convenio === 'PARTICULAR' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {paciente.convenio === 'PARTICULAR' ? '💳' : '🏥'} {paciente.convenio}
                            </span>
                            {paciente.convenio === 'PARTICULAR' && (
                              <span className="text-xs text-green-600 font-medium">Particular</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditPaciente(paciente)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleAtivo(paciente)}
                            className={`p-1 rounded ${
                              paciente.ativo
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={paciente.ativo ? 'Inativar' : 'Ativar'}
                          >
                            {paciente.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeletePaciente(paciente)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Novo Paciente' : 'Editar Paciente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do paciente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone || ''}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.data_nascimento || ''}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convênio <span className="text-gray-500">(opcional)</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.convenio || ''}
                    onChange={(e) => setFormData({ ...formData, convenio: e.target.value || undefined })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors ${
                      formData.convenio 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <option value="">Selecione um convênio...</option>
                    {CONVENIOS_PERMITIDOS.map((conv) => (
                      <option key={conv} value={conv}>
                        {conv === 'PARTICULAR' ? '💳 PARTICULAR' : conv}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {formData.convenio && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {formData.convenio === 'PARTICULAR' ? '💳' : '🏥'} {formData.convenio}
                    </span>
                    {formData.convenio === 'PARTICULAR' && (
                      <span className="text-xs text-gray-500">Paciente particular</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereco
                </label>
                <textarea
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Endereco completo"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePaciente}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                disabled={actionLoading || !formData.nome}
              >
                {actionLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

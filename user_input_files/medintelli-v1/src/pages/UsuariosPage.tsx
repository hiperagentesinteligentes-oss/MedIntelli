import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types';
import Layout from '@/components/Layout';
import { Settings, Plus, Edit2, X } from 'lucide-react';

const FUNCTION_URL = 'https://ufxdewolfdpgrxdkvnbr.supabase.co/functions/v1/manage-user';

interface UserFormData {
  email: string;
  password: string;
  nome: string;
  telefone: string;
  role: UserRole;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    nome: '',
    telefone: '',
    role: 'secretaria',
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        email: editingUser.email,
        password: '',
        nome: editingUser.nome,
        telefone: editingUser.telefone || '',
        role: editingUser.role,
      });
    } else {
      setFormData({
        email: '',
        password: '',
        nome: '',
        telefone: '',
        role: 'secretaria',
      });
    }
    setFormError('');
  }, [editingUser]);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ativo: !ativo })
        .eq('id', id);

      if (error) throw error;
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar status do usuário');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      // Validações
      if (!formData.nome.trim()) {
        throw new Error('Nome é obrigatório');
      }
      if (!formData.email.trim()) {
        throw new Error('Email é obrigatório');
      }
      if (!editingUser && !formData.password) {
        throw new Error('Senha é obrigatória para novos usuários');
      }
      if (!editingUser && formData.password.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres');
      }

      const action = editingUser ? 'update' : 'create';
      const userData = editingUser
        ? {
            userId: editingUser.user_id,
            email: formData.email,
            nome: formData.nome,
            telefone: formData.telefone,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {})
          }
        : {
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            telefone: formData.telefone,
            role: formData.role,
          };

      // Obter o token do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeGRld29sZmRwZ3J4ZGt2bmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDUzODAsImV4cCI6MjA3MjE4MTM4MH0.UO5TXxx9zDPY8jAChn7Tu6E_vH4ssc4z-ESalXjPmKI',
        },
        body: JSON.stringify({ action, userData }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar usuário');
      }

      // Fechar formulário e recarregar lista
      setShowForm(false);
      setEditingUser(null);
      loadUsuarios();
      
      alert(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      setFormError(error.message || 'Erro ao salvar usuário');
    } finally {
      setFormLoading(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'administrador': return 'bg-blue-100 text-blue-800';
      case 'medico': return 'bg-green-100 text-green-800';
      case 'secretaria': return 'bg-yellow-100 text-yellow-800';
      case 'auxiliar': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'administrador': return 'Administrador';
      case 'medico': return 'Médico';
      case 'secretaria': return 'Secretaria';
      case 'auxiliar': return 'Auxiliar';
      default: return role;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Settings className="w-7 h-7" />
            <span>Gestão de Usuários</span>
          </h1>

          <button
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Total de usuários: <span className="font-semibold">{usuarios.length}</span>
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando usuários...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum usuário cadastrado</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{usuario.nome}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getRoleColor(usuario.role)}`}>
                          {getRoleLabel(usuario.role)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>Email: {usuario.email}</span>
                        {usuario.telefone && <span>Tel: {usuario.telefone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleAtivo(usuario.id, usuario.ativo)}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          usuario.ativo
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {usuario.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(usuario);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="usuario@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="secretaria">Secretaria</option>
                    <option value="auxiliar">Auxiliar</option>
                    <option value="medico">Médico</option>
                    <option value="administrador">Administrador</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {!editingUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingUser ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'}
                    minLength={6}
                    required={!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe em branco para manter a senha atual
                    </p>
                  )}
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={formLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={formLoading}
                  >
                    {formLoading ? 'Salvando...' : editingUser ? 'Atualizar' : 'Criar Usuário'}
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

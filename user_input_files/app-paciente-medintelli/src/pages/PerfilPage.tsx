import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Calendar, FileText, LogOut, Shield, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PerfilPage() {
  const { paciente, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm('Deseja sair do aplicativo?')) {
      await signOut();
    }
  };

  if (!paciente) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      {/* Header com Avatar e Botão Voltar */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-8">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 text-white hover:text-blue-100 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{paciente.nome}</h2>
          <p className="text-blue-100">Paciente MedIntelli</p>
        </div>
      </div>

      {/* Informações Pessoais */}
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
          
          <div className="space-y-3">
            {paciente.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">E-mail</p>
                  <p className="text-sm text-gray-900">{paciente.email}</p>
                </div>
              </div>
            )}
            
            {paciente.telefone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p className="text-sm text-gray-900">{paciente.telefone}</p>
                </div>
              </div>
            )}
            
            {paciente.cpf && (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">CPF</p>
                  <p className="text-sm text-gray-900">{paciente.cpf}</p>
                </div>
              </div>
            )}
            
            {paciente.data_nascimento && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Data de Nascimento</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(paciente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plano de Saúde */}
        {paciente.plano_saude && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Plano de Saúde</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Convênio</p>
                  <p className="text-sm text-gray-900">{paciente.plano_saude}</p>
                </div>
              </div>
              
              {paciente.numero_carteirinha && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Número da Carteirinha</p>
                    <p className="text-sm text-gray-900">{paciente.numero_carteirinha}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Endereço */}
        {paciente.endereco && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Endereço</h3>
            <p className="text-sm text-gray-600">{paciente.endereco}</p>
          </div>
        )}

        {/* Observações Médicas */}
        {paciente.observacoes_medicas && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-600" />
              Observações Médicas
            </h3>
            <p className="text-sm text-gray-700">{paciente.observacoes_medicas}</p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2 pt-4">
          <button className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm flex items-center justify-center gap-2">
            <User className="w-5 h-5" />
            Editar Perfil
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-red-700 hover:bg-red-100 font-medium text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-500 pt-4">
          <p>MedIntelli - Portal do Paciente</p>
          <p>Versão 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

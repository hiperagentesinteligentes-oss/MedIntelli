import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FUNCTION_URL } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { 
  BookOpen, 
  Save, 
  History, 
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BUCVersion {
  id: number;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export default function BaseConhecimentoPage() {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [versions, setVersions] = useState<BUCVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<BUCVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLatestVersion();
    loadVersions();
  }, []);

  const loadLatestVersion = async () => {
    if (!session) return;

    try {
      const response = await fetch(`${FUNCTION_URL}/buc-manager?latest=true`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar versão atual');

      const result = await response.json();
      if (result.success && result.data) {
        setCurrentVersion(result.data);
        setContent(result.data.content);
      }
    } catch (error) {
      console.error('Erro ao carregar versão:', error);
      showMessage('error', 'Erro ao carregar conteúdo da BUC');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!session) return;

    try {
      const response = await fetch(`${FUNCTION_URL}/buc-manager`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar histórico');

      const result = await response.json();
      if (result.success) {
        setVersions(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleSave = async () => {
    if (!session) return;

    if (!content.trim()) {
      showMessage('error', 'O conteúdo não pode estar vazio');
      return;
    }

    if (content.length > 50000) {
      showMessage('error', 'O conteúdo excede o limite de 50.000 caracteres');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${FUNCTION_URL}/buc-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      const result = await response.json();
      if (result.success) {
        showMessage('success', `Nova versão ${result.data.version} criada com sucesso!`);
        setCurrentVersion(result.data);
        loadVersions();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('error', 'Erro ao salvar conteúdo da BUC');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = (version: BUCVersion) => {
    setContent(version.content);
    setShowHistory(false);
    showMessage('success', `Versão ${version.version} restaurada. Clique em Salvar para criar nova versão.`);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const charCount = content.length;
  const charLimit = 50000;
  const charPercentage = (charCount / charLimit) * 100;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Base Única de Conhecimento
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Gerencie o conteúdo que guia o Agente IA nas respostas automáticas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {preview ? 'Editar' : 'Preview'}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Version Info */}
        {currentVersion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Versão Atual: {currentVersion.version}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Última atualização: {format(new Date(currentVersion.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <button
                onClick={loadLatestVersion}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : (
            <>
              {preview ? (
                <div className="prose max-w-none">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 whitespace-pre-wrap font-mono text-sm">
                    {content}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conteúdo da Base de Conhecimento
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={25}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-y"
                      placeholder="Digite o conteúdo da Base Única de Conhecimento..."
                    />
                  </div>

                  {/* Character Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            charPercentage > 90 ? 'bg-red-600' : charPercentage > 70 ? 'bg-yellow-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(charPercentage, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm ${
                        charPercentage > 90 ? 'text-red-600 font-semibold' : 'text-gray-600'
                      }`}>
                        {charCount.toLocaleString('pt-BR')} / {charLimit.toLocaleString('pt-BR')} caracteres
                      </span>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={saving || !content.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar Nova Versão
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Versões
            </h2>

            {versions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma versão encontrada</p>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                      currentVersion?.id === version.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Versão {version.version}
                          </span>
                          {currentVersion?.id === version.id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Atual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Criada em: {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {version.content.substring(0, 100)}...
                        </p>
                      </div>

                      {currentVersion?.id !== version.id && (
                        <button
                          onClick={() => handleRestoreVersion(version)}
                          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-colors"
                        >
                          Restaurar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-2">Dicas para editar a BUC:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Organize o conteúdo em seções claras (use ## para títulos)</li>
                <li>Inclua informações da clínica, protocolos e exemplos</li>
                <li>Seja específico sobre regras de priorização</li>
                <li>Adicione exemplos de situações comuns</li>
                <li>Sempre salve uma nova versão antes de testar mudanças</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

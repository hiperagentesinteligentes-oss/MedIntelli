import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import Layout from '@/components/Layout';
import { 
  Smartphone, 
  Webhook, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Copy,
  AlertCircle,
  Settings
} from 'lucide-react';

interface APIStatus {
  status: 'online' | 'offline' | 'checking';
  message: string;
  lastCheck: string;
}

export default function WhatsAppConfigPage() {
  const { profile } = useAuth();
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    status: 'checking',
    message: 'Verificando status...',
    lastCheck: new Date().toISOString(),
  });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAPIStatus();
    generateWebhookUrl();
    
    const interval = setInterval(checkAPIStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkAPIStatus = async () => {
    setApiStatus(prev => ({ ...prev, status: 'checking' }));
    
    try {
      // Simulate API check - Replace with actual AVISA API health check
      const response = await fetch('https://api.avisa.app/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null);

      if (response && response.ok) {
        setApiStatus({
          status: 'online',
          message: 'API AVISA conectada e funcionando',
          lastCheck: new Date().toISOString(),
        });
      } else {
        setApiStatus({
          status: 'offline',
          message: 'API AVISA não está respondendo',
          lastCheck: new Date().toISOString(),
        });
      }
    } catch (error) {
      setApiStatus({
        status: 'offline',
        message: 'Erro ao verificar status da API',
        lastCheck: new Date().toISOString(),
      });
    }
  };

  const generateWebhookUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ufxdewolfdpgrxdkvnbr.supabase.co';
    const url = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    setWebhookUrl(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = () => {
    switch (apiStatus.status) {
      case 'online':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'offline':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (apiStatus.status) {
      case 'online':
        return 'bg-green-50 border-green-200';
      case 'offline':
        return 'bg-red-50 border-red-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Configuração WhatsApp
            </h1>
          </div>
          <p className="text-gray-600">
            Monitore o status da API AVISA e configure o webhook para receber mensagens.
          </p>
        </div>

        {/* API Status */}
        <div className={`bg-white shadow-sm rounded-lg p-6 border-2 ${getStatusColor()}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {getStatusIcon()}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Status da API AVISA
                </h2>
                <p className="text-gray-700 mb-2">{apiStatus.message}</p>
                <p className="text-sm text-gray-500">
                  Última verificação: {new Date(apiStatus.lastCheck).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <button
              onClick={checkAPIStatus}
              disabled={apiStatus.status === 'checking'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${apiStatus.status === 'checking' ? 'animate-spin' : ''}`} />
              Verificar
            </button>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Webhook className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Webhook Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Webhook
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instruções de Configuração:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Copie a URL do webhook acima</li>
                    <li>Acesse o painel da API AVISA</li>
                    <li>Configure o webhook para receber mensagens</li>
                    <li>Adicione a URL do webhook no campo apropriado</li>
                    <li>Configure os eventos: message.received, message.sent</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Configurações de Integração
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Agente IA</h3>
              <p className="text-sm text-gray-600 mb-3">
                Respostas automáticas com inteligência artificial
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Ativo
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Base de Conhecimento</h3>
              <p className="text-sm text-gray-600 mb-3">
                BUC configurada com protocolos da clínica
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Ativo
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notificações</h3>
              <p className="text-sm text-gray-600 mb-3">
                Alertas para novos atendimentos urgentes
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Ativo
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Relatórios</h3>
              <p className="text-sm text-gray-600 mb-3">
                Análise de conversas e métricas de atendimento
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Ativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

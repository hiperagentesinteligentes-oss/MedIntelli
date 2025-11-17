import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { supabase, FUNCTION_URL } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente de mensagem memoizado para evitar re-renders desnecessarios
const MessageBubble = memo(({ msg }: { msg: ChatMessage }) => {
  const formattedTime = useMemo(() => {
    return format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR });
  }, [msg.timestamp]);

  return (
    <div
      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          msg.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        <p
          className={`text-xs mt-1 ${
            msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {formattedTime}
        </p>
      </div>
      {msg.role === 'user' && (
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Componente de sugestoes memoizado
const SuggestionButtons = memo(({ pacienteNome, onSuggestionClick }: { 
  pacienteNome: string;
  onSuggestionClick: (text: string) => void;
}) => (
  <div className="text-center py-12">
    <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Ola, {pacienteNome}!
    </h3>
    <p className="text-gray-600">
      Como posso ajudar voce hoje?
    </p>
    <div className="mt-6 space-y-2">
      <button
        onClick={() => onSuggestionClick('Gostaria de agendar uma consulta')}
        className="block w-full max-w-xs mx-auto px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Agendar consulta
      </button>
      <button
        onClick={() => onSuggestionClick('Preciso enviar resultados de exames')}
        className="block w-full max-w-xs mx-auto px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Enviar exames
      </button>
      <button
        onClick={() => onSuggestionClick('Tenho uma duvida sobre meu tratamento')}
        className="block w-full max-w-xs mx-auto px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Tirar duvida
      </button>
    </div>
  </div>
));

SuggestionButtons.displayName = 'SuggestionButtons';

export default function ChatPage() {
  const { paciente } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedHistory = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Carregar historico apenas uma vez
    if (paciente && !hasLoadedHistory.current) {
      hasLoadedHistory.current = true;
      loadChatHistory();
    }

    // Cleanup: abortar requisicoes pendentes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [paciente]);

  const loadChatHistory = async () => {
    if (!paciente) return;

    try {
      const { data, error } = await supabase
        .from('conversas_ia')
        .select('*')
        .eq('paciente_id', paciente.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const chatMessages: ChatMessage[] = [];
      data?.forEach((conv: any) => {
        chatMessages.push({
          id: `${conv.id}-user`,
          role: 'user',
          content: conv.mensagem,
          timestamp: conv.created_at,
        });
        chatMessages.push({
          id: `${conv.id}-assistant`,
          role: 'assistant',
          content: conv.resposta,
          timestamp: conv.created_at,
          intencao: conv.intencao_classificada,
        });
      });

      setMessages(chatMessages);
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !paciente || loading) return;

    const trimmedInput = input.trim();
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Criar novo AbortController para esta requisicao
    abortControllerRef.current = new AbortController();

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // Chamar edge function agent-ia v3
      const response = await fetch(`${FUNCTION_URL}/agent-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensagem: trimmedInput,
          paciente_id: paciente.id,
          origem: 'app',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Erro na resposta da IA');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.resposta || data.data?.resposta_paciente || 'Desculpe, nao consegui processar sua mensagem.',
        timestamp: new Date().toISOString(),
        intencao: data.intencao || data.data?.intencao,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Salvar no banco ja e feito pela edge function agent-ia
      // Nao precisamos duplicar aqui
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Requisicao abortada');
        return;
      }
      
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestionClick = useCallback((text: string) => {
    setInput(text);
  }, []);

  // Renderizar loading inicial
  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Carregando historico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Assistente MedIntelli</h2>
          <p className="text-sm text-gray-500">Online - Sempre disponivel</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <SuggestionButtons 
            pacienteNome={paciente?.nome || ''} 
            onSuggestionClick={handleSuggestionClick}
          />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

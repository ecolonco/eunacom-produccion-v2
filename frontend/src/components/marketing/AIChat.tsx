/**
 * AI Chat Component
 *
 * Interfaz de chat interactivo con IA para consultas sobre campañas
 */

import React, { useState, useEffect, useRef } from 'react';
import marketingAPI, { ChatMessage } from '../../services/marketing-api.service';

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = async () => {
    try {
      const history = await marketingAPI.getChatHistory(sessionId, 50);
      setMessages(history);
    } catch (err) {
      console.error('Error loading chat history:', err);
      // No mostrar error si es la primera carga
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Agregar mensaje del usuario inmediatamente
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    setLoading(true);

    try {
      const response = await marketingAPI.sendChatMessage(userMessage, sessionId);

      // Agregar respuesta de la IA
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.error || 'Error enviando mensaje');

      // Remover mensaje temporal del usuario en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    '¿Cuál es mi campaña con mejor ROI?',
    '¿Por qué bajaron las conversiones esta semana?',
    'Dame recomendaciones para mejorar el CTR',
    '¿Cuánto he gastado este mes?',
    'Analiza el rendimiento de todas mis campañas',
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[700px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">💬</span>
          Chat con IA
        </h2>
        <p className="text-blue-100 mt-1">Pregunta cualquier cosa sobre tus campañas</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Hola! Soy tu asistente de marketing
            </h3>
            <p className="text-gray-600 mb-6">
              Puedo ayudarte a analizar tus campañas, responder preguntas y darte recomendaciones.
            </p>

            {/* Suggested Questions */}
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-gray-500 mb-3 font-medium">
                Preguntas sugeridas:
              </p>
              <div className="space-y-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
                  >
                    💡 {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </>
        )}

        {loading && <TypingIndicator />}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </span>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white ml-12'
            : 'bg-gray-100 text-gray-900 mr-12'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🤖</span>
            <span className="text-xs font-semibold text-gray-600">IA Marketing</span>
          </div>
        )}

        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Typing Indicator Component
// ============================================================================

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-lg px-4 py-3 mr-12">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs text-gray-600">Pensando...</span>
        </div>
      </div>
    </div>
  );
};

export default AIChat;

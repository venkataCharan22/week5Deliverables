import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Square } from 'lucide-react';
import ChatBubble from '../components/ChatBubble';
import AgentSteps from '../components/AgentSteps';
import { useAgentChat } from '../hooks/useAgentChat';

const quickPrompts = [
  'Which items are low in stock?',
  'What were my top sales this week?',
  'Suggest a discount strategy',
  'Help me reorder inventory',
];

export default function ChatPage() {
  const { messages, isLoading, agentSteps, sendMessage, cancel } = useAgentChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentSteps]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-dvh flex-col pb-20 pt-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
          <Sparkles size={14} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-base font-bold">BizBuddy AI</h1>
          <p className="text-[11px] text-gray-500">Agentic AI — Powered by Llama 3.3 70B</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <AgentSteps steps={agentSteps} />}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="shrink-0 rounded-full border border-gray-800 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-800 bg-gray-950 px-4 pt-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            className="input flex-1 py-2.5"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={cancel}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-gray-950 transition-colors hover:bg-emerald-400 disabled:bg-gray-800 disabled:text-gray-600"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

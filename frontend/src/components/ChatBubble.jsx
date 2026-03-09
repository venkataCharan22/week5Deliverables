import { Bot, User } from 'lucide-react';

function FormattedText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Bullet point lines (*, -, or numbered)
        const bulletMatch = trimmed.match(/^(?:[*\-]|\d+[.)]) (.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0 text-emerald-400/60">&#8226;</span>
              <span>{renderBold(bulletMatch[1])}</span>
            </div>
          );
        }

        return <div key={i}>{renderBold(trimmed)}</div>;
      })}
    </div>
  );
}

function renderBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  );
}

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const steps = message.steps;

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-emerald-500/15' : 'bg-gray-800'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-emerald-400" />
        ) : (
          <Bot size={14} className="text-gray-400" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-md bg-emerald-500 text-gray-950'
            : 'rounded-tl-md bg-gray-800 text-gray-200'
        }`}
      >
        {!isUser && steps && steps.length > 0 && (
          <details className="mb-2 text-[10px] text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">
              {steps.length} tool{steps.length > 1 ? 's' : ''} used
            </summary>
            <div className="mt-1 space-y-0.5 border-l border-gray-700 pl-2">
              {steps.map((s, i) => (
                <div key={i}>{s.summary || s.label}</div>
              ))}
            </div>
          </details>
        )}
        {isUser ? message.content : <FormattedText text={message.content} />}
      </div>
    </div>
  );
}

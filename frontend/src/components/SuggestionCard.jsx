import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function SuggestionCard({ product, onAdd }) {
  const [status, setStatus] = useState('idle'); // idle | adding | added

  const handleAdd = async () => {
    setStatus('adding');
    try {
      await onAdd(product);
      setStatus('added');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 text-2xl">
        {product.emoji}
      </div>
      <p className="line-clamp-2 text-center text-xs font-medium leading-tight">
        {product.name}
      </p>
      <p className="text-[10px] text-gray-500">~₹{(product.typical_price ?? 0).toLocaleString()}</p>

      <button
        onClick={handleAdd}
        disabled={status !== 'idle'}
        className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          status === 'added'
            ? 'bg-emerald-500/15 text-emerald-400'
            : status === 'adding'
              ? 'bg-gray-800 text-gray-500'
              : 'bg-gray-800 text-gray-300 hover:bg-emerald-500/15 hover:text-emerald-400'
        }`}
      >
        {status === 'added' ? (
          <Check size={14} />
        ) : status === 'adding' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Plus size={14} />
        )}
      </button>
    </div>
  );
}

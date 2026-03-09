import { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

export default function PosterPage() {
  const [description, setDescription] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsLoading(true);
    setGeneratedText('');

    try {
      const { data } = await api.post('/poster', { description: description.trim() });
      setGeneratedText(data.poster_text);
    } catch (err) {
      setGeneratedText(
        `🔥 SPECIAL OFFER! 🔥\n\n${description}\n\n✅ Limited Time Only\n✅ Best Prices Guaranteed\n\n📍 Visit us today!\n\n(Backend not reachable — showing fallback)`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 px-4 pb-24 pt-6">
      <div>
        <h1 className="text-xl font-bold">Poster Generator</h1>
        <p className="mt-1 text-xs text-gray-500">
          Create eye-catching promotional content with AI
        </p>
      </div>

      {/* Input */}
      <div className="card space-y-4">
        <label className="block text-sm font-medium">
          Describe your offer or promotion
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 20% off on all rice and dal this weekend, buy 2 get 1 free on cooking oil"
          rows={4}
          className="input resize-none"
        />
        <button
          onClick={handleGenerate}
          disabled={!description.trim() || isLoading}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Sparkles size={16} />
              Generate Poster Text
            </>
          )}
        </button>
      </div>

      {/* Quick Templates */}
      {!generatedText && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Quick Templates</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Weekend Sale – 10% off everything',
              'New Stock Arrived – Fresh Groceries',
              'Festival Special – Buy More Save More',
              'Clearance Sale – Up to 50% off',
            ].map((template) => (
              <button
                key={template}
                onClick={() => setDescription(template)}
                className="rounded-xl border border-gray-800 px-3 py-3 text-left text-xs text-gray-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated Result */}
      {generatedText && (
        <div className="card border-emerald-500/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-400">Generated Poster</h2>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200"
              >
                <RefreshCw size={12} />
                Redo
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs text-emerald-400"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-xl bg-gray-800/50 p-4 text-sm leading-relaxed">
            {generatedText}
          </div>
        </div>
      )}
    </div>
  );
}

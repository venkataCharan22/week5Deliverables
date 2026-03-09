import { useState } from 'react';
import { X, ShoppingCart, Minus, Plus } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function SellModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [selling, setSelling] = useState(false);

  const maxQty = product.quantity;
  const total = qty * product.price;

  const handleSell = async () => {
    if (qty < 1 || qty > maxQty) return;
    setSelling(true);
    try {
      await onConfirm({ productId: product.id, quantity: qty, customerName: customerName.trim() || null });
      onClose();
    } catch (err) {
      console.error('Sell failed:', err);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
              <ShoppingCart size={18} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold">Sell Product</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2 space-y-4">
          {/* Product info */}
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{product.category} &middot; ₹{product.price} each &middot; {product.quantity} in stock</p>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Quantity to sell</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 active:scale-95"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[3rem] text-center text-2xl font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(Math.min(maxQty, qty + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Customer name (optional) */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer name (optional)</label>
            <input
              className="input"
              placeholder="Walk-in customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Total */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Amount</span>
              <span className="text-xl font-bold text-emerald-400">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3">
          <button
            onClick={handleSell}
            disabled={selling || qty < 1 || qty > maxQty}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {selling ? <LoadingSpinner size="sm" /> : (
              <>
                <ShoppingCart size={16} />
                Confirm Sale &middot; ₹{total.toLocaleString('en-IN')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

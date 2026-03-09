import { useState, useRef } from 'react';
import { X, Clock, Minus, Plus, Calendar } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const QUICK_DURATIONS = [
  { label: '5 Min', mins: 5 },
  { label: '30 Min', mins: 30 },
  { label: '1 Hour', mins: 60 },
  { label: '1 Day', mins: 24 * 60 },
  { label: '3 Days', mins: 3 * 24 * 60 },
  { label: '1 Week', mins: 7 * 24 * 60 },
  { label: '2 Weeks', mins: 14 * 24 * 60 },
  { label: '1 Month', mins: 30 * 24 * 60 },
];

function toLocalDatetimeStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

// Default: 1 day from now
const defaultReturn = () => toLocalDatetimeStr(new Date(Date.now() + 24 * 60 * 60 * 1000));

export default function RentModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [returnDate, setReturnDate] = useState(defaultReturn);
  const [activeDuration, setActiveDuration] = useState('1 Day');
  const [renting, setRenting] = useState(false);
  const dateRef = useRef(null);

  const maxQty = product.quantity;
  const now = new Date();
  const minDate = toLocalDatetimeStr(now);

  const setQuickDuration = (mins, label) => {
    const d = new Date(Date.now() + mins * 60 * 1000);
    setReturnDate(toLocalDatetimeStr(d));
    setActiveDuration(label);
  };

  const handleDateChange = (e) => {
    setReturnDate(e.target.value);
    setActiveDuration(null);
  };

  const handleRent = async () => {
    // Read directly from ref as fallback for Safari
    const finalDate = returnDate || dateRef.current?.value || '';
    if (qty < 1 || qty > maxQty || !finalDate) return;
    setRenting(true);
    try {
      await onConfirm({
        productId: product.id,
        quantity: qty,
        customerName: customerName.trim() || null,
        returnDate: new Date(finalDate).toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Rent failed:', err);
    } finally {
      setRenting(false);
    }
  };

  const isValid = qty >= 1 && qty <= maxQty && !!returnDate;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
              <Clock size={18} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold">Rent Out</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4 scrollbar-none">
          {/* Product info */}
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{product.category} &middot; ₹{product.price} &middot; {product.quantity} available</p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Quantity to rent</label>
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

          {/* Customer name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer name</label>
            <input
              className="input"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Quick duration chips */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Rental duration</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setQuickDuration(d.mins, d.label)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                    activeDuration === d.label
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-blue-500/20 hover:text-blue-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/time picker */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              <Calendar size={12} className="inline mr-1" />
              Return date & time
            </label>
            <input
              ref={dateRef}
              type="datetime-local"
              className="input"
              min={minDate}
              value={returnDate}
              onChange={handleDateChange}
              onInput={handleDateChange}
              onBlur={() => {
                // Safari fallback: read value from DOM on blur
                if (dateRef.current?.value && !returnDate) {
                  setReturnDate(dateRef.current.value);
                }
              }}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          <button
            onClick={handleRent}
            disabled={renting || !isValid}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-colors active:scale-95 ${
              isValid && !renting
                ? 'bg-blue-500 hover:bg-blue-400'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {renting ? <LoadingSpinner size="sm" /> : (
              <>
                <Clock size={16} />
                Confirm Rental
              </>
            )}
          </button>
          {!isValid && !renting && (
            <p className="mt-2 text-center text-[10px] text-gray-600">
              {!returnDate ? 'Select a return date above' : qty > maxQty ? 'Not enough stock' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

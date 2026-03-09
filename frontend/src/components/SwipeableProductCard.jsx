import { useRef, useState } from 'react';
import { ShoppingCart, Clock, Package, ChevronLeft, IndianRupee, Sparkles } from 'lucide-react';
import api from '../lib/api';

function getStockBadge(quantity, threshold) {
  if (quantity <= threshold * 0.3) return { label: 'Critical', className: 'badge-low' };
  if (quantity <= threshold) return { label: 'Low Stock', className: 'badge-warning' };
  return { label: 'In Stock', className: 'badge-ok' };
}

export default function SwipeableProductCard({ product, onSell, onRent, onEdit }) {
  const { name, category, quantity, price, threshold, image } = product;
  const badge = getStockBadge(quantity, threshold);

  const isEmoji = image && !image.startsWith('data:') && !image.startsWith('http') && image.length <= 4;
  const isDataUri = image && image.startsWith('data:');
  const isUrl = image && image.startsWith('http');

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [priceTip, setPriceTip] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const ACTION_WIDTH = 220;

  const startXRef = useRef(0);
  const startOpenRef = useRef(false);
  const latestDragX = useRef(0);
  const didDrag = useRef(false);

  // Compute the actual translateX
  const getOffset = () => {
    if (dragging) return dragX;
    return open ? -ACTION_WIDTH : 0;
  };

  const beginDrag = (clientX) => {
    startXRef.current = clientX;
    startOpenRef.current = open;
    didDrag.current = false;
    latestDragX.current = open ? -ACTION_WIDTH : 0;
    setDragX(open ? -ACTION_WIDTH : 0);
    setDragging(true);
  };

  const moveDrag = (clientX) => {
    const dx = clientX - startXRef.current;
    if (Math.abs(dx) > 5) didDrag.current = true;
    const base = startOpenRef.current ? -ACTION_WIDTH : 0;
    const val = Math.min(0, Math.max(-ACTION_WIDTH, base + dx));
    latestDragX.current = val;
    setDragX(val);
  };

  const endDrag = () => {
    setDragging(false);
    // Use ref for the latest value (avoids stale closure)
    const finalX = latestDragX.current;
    if (finalX < -ACTION_WIDTH / 3) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // ─── Touch ───
  const onTouchStart = (e) => beginDrag(e.touches[0].clientX);
  const onTouchMove = (e) => moveDrag(e.touches[0].clientX);
  const onTouchEnd = () => endDrag();

  // ─── Mouse ───
  const onMouseDown = (e) => {
    e.preventDefault();
    beginDrag(e.clientX);

    const onMouseMove = (ev) => moveDrag(ev.clientX);
    const onMouseUp = () => {
      endDrag();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ─── Click toggle via the image/icon area ───
  const handleToggle = (e) => {
    e.stopPropagation();
    if (didDrag.current) return;
    setOpen((prev) => !prev);
  };

  const handleCardClick = () => {
    if (didDrag.current) return;
    if (open) {
      setOpen(false);
    } else {
      onEdit(product);
    }
  };

  const offset = getOffset();

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action buttons behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{
          opacity: Math.min(1, Math.abs(offset) / 50),
          transition: dragging ? 'none' : 'opacity 0.3s ease',
        }}
      >
        <button
          onClick={() => { setOpen(false); onSell(product); }}
          className="flex w-[73px] flex-col items-center justify-center gap-1.5 bg-emerald-500 text-gray-950 transition-transform active:scale-95"
        >
          <ShoppingCart size={18} />
          <span className="text-[10px] font-bold">Sell</span>
        </button>
        <button
          onClick={() => { setOpen(false); onRent(product); }}
          className="flex w-[73px] flex-col items-center justify-center gap-1.5 bg-blue-500 text-white transition-transform active:scale-95"
        >
          <Clock size={18} />
          <span className="text-[10px] font-bold">Rent</span>
        </button>
        <button
          onClick={async () => {
            if (priceTip) { setPriceTip(null); return; }
            setLoadingPrice(true);
            try {
              const { data } = await api.post('/optimize-price', { product_id: product.id });
              setPriceTip(data);
            } catch { setPriceTip(null); }
            finally { setLoadingPrice(false); }
          }}
          className="flex w-[74px] flex-col items-center justify-center gap-1.5 bg-amber-500 text-gray-950 transition-transform active:scale-95"
        >
          {loadingPrice ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          ) : (
            <IndianRupee size={18} />
          )}
          <span className="text-[10px] font-bold">AI Price</span>
        </button>
      </div>

      {/* Swipeable card */}
      <div
        className="relative z-10 card flex w-full items-center gap-3 text-left select-none"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={handleCardClick}
      >
        {/* Left toggle — click to slide open/closed */}
        <div
          onClick={handleToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800 transition-colors hover:bg-gray-700 cursor-pointer"
        >
          {open ? (
            <ChevronLeft size={18} className="text-emerald-400" />
          ) : isDataUri || isUrl ? (
            <img src={image} alt={name} className="h-full w-full object-cover" draggable={false} />
          ) : isEmoji ? (
            <span className="text-xl">{image}</span>
          ) : (
            <Package size={18} className="text-gray-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <span className={badge.className}>{badge.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {category} &middot; Qty: {quantity} &middot; ₹{price}
          </p>
        </div>

        <ChevronLeft size={14} className={`text-gray-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* AI Price Tip */}
      {priceTip && (
        <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> AI Price Suggestion
            </span>
            <button onClick={() => setPriceTip(null)} className="text-gray-600 text-xs">dismiss</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Min</p>
              <p className="text-sm font-bold text-gray-400">{'\u20B9'}{priceTip.min_price}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-emerald-400">Suggested</p>
              <p className="text-lg font-bold text-emerald-400">{'\u20B9'}{priceTip.suggested_price}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Max</p>
              <p className="text-sm font-bold text-gray-400">{'\u20B9'}{priceTip.max_price}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">{priceTip.reason}</p>
          {priceTip.tip && <p className="text-[10px] text-amber-400/70">{priceTip.tip}</p>}
          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${
            priceTip.strategy === 'increase' ? 'bg-emerald-500/15 text-emerald-400' :
            priceTip.strategy === 'decrease' ? 'bg-red-500/15 text-red-400' :
            priceTip.strategy === 'clearance' ? 'bg-amber-500/15 text-amber-400' :
            'bg-gray-800 text-gray-400'
          }`}>{priceTip.strategy}</span>
        </div>
      )}
    </div>
  );
}

import { Package } from 'lucide-react';

function getStockBadge(quantity, threshold) {
  if (quantity <= threshold * 0.3)
    return { label: 'Critical', className: 'badge-low' };
  if (quantity <= threshold)
    return { label: 'Low Stock', className: 'badge-warning' };
  return { label: 'In Stock', className: 'badge-ok' };
}

export default function ProductCard({ product, onClick }) {
  const { name, category, quantity, price, threshold, image } = product;
  const badge = getStockBadge(quantity, threshold);

  const isEmoji = image && !image.startsWith('data:') && !image.startsWith('http') && image.length <= 4;
  const isDataUri = image && image.startsWith('data:');
  const isUrl = image && image.startsWith('http');

  return (
    <button
      onClick={onClick}
      className="card flex w-full items-center gap-3 text-left transition-colors hover:border-gray-700 active:bg-gray-800/50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800">
        {isDataUri || isUrl ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
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
    </button>
  );
}

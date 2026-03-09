import { X, RotateCcw } from 'lucide-react';
import api from '../lib/api';

function timeAgo(date) {
  const now = new Date();
  const diff = date - now;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    // Past
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } else {
    // Future
    if (hours < 1) return 'in < 1h';
    if (hours < 24) return `in ${hours}h`;
    return `in ${days}d`;
  }
}

export default function NotificationPanel({ notifications, onClose, onRentalReturned }) {
  const handleReturn = async (notification) => {
    try {
      await api.post('/return-rental', { rental_id: notification.rentalId });
      if (onRentalReturned) onRentalReturned();
    } catch (err) {
      console.error('Return rental failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-2 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="mx-4 mt-12 max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h3 className="text-sm font-bold">Notifications</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Notification list */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
              No notifications right now
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 border-b border-gray-800/50 px-4 py-3 transition-colors ${
                  n.urgency === 'high'
                    ? 'bg-red-500/5'
                    : n.urgency === 'medium'
                    ? 'bg-amber-500/5'
                    : ''
                }`}
              >
                <span className="mt-0.5 text-lg">{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.urgency === 'high' && (
                      <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{n.message}</p>

                  {/* Rental return button */}
                  {n.type === 'rental' && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleReturn(n)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                      >
                        <RotateCcw size={11} />
                        Mark Returned
                      </button>
                      {n.returnDate && (
                        <span className="text-[10px] text-gray-600">
                          Due {timeAgo(n.returnDate)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Festival info */}
                  {n.type === 'festival' && n.daysAway != null && (
                    <p className="mt-1 text-[10px] text-gray-600">
                      {n.festivalName ? `${n.festivalName} — ` : ''}{n.daysAway} days away
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

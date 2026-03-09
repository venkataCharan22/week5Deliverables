import { useState, useEffect } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function RentalCountdown({ returnDate }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = returnDate instanceof Date ? returnDate.getTime() : new Date(returnDate).getTime();
  const diff = target - now;
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((abs % (60 * 1000)) / 1000);

  const color = isOverdue
    ? 'text-red-400'
    : diff < 60 * 60 * 1000
    ? 'text-amber-400'
    : 'text-emerald-400';

  const bgColor = isOverdue
    ? 'bg-red-500/10'
    : diff < 60 * 60 * 1000
    ? 'bg-amber-500/10'
    : 'bg-emerald-500/10';

  return (
    <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${bgColor}`}>
      {isOverdue && <span className="text-[10px] text-red-400 font-bold mr-1">OVERDUE</span>}
      <div className={`font-mono text-sm font-bold tabular-nums ${color}`}>
        {days > 0 && <span>{days}d </span>}
        <span>{pad(hours)}</span>
        <span className="animate-pulse">:</span>
        <span>{pad(mins)}</span>
        <span className="animate-pulse">:</span>
        <span>{pad(secs)}</span>
      </div>
    </div>
  );
}

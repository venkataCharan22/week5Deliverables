export default function StatsCard({ icon: Icon, label, value, trend, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="card flex items-start gap-3">
      <div className={`rounded-xl p-2.5 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p className="mt-0.5 text-xs text-emerald-400">{trend}</p>
        )}
      </div>
    </div>
  );
}

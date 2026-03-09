export default function InsightCard({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-3">
      <span className="mt-0.5 text-lg">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-200">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>
    </div>
  );
}

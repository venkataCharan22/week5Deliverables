import { Loader2, CheckCircle2, Database, TrendingUp, Package, Receipt, BarChart3, ShoppingCart, FileText, Sparkles } from 'lucide-react';

const TOOL_ICONS = {
  get_inventory: Package,
  get_low_stock_items: Package,
  get_sales_analytics: BarChart3,
  get_recent_transactions: Receipt,
  get_demand_forecast: TrendingUp,
  get_restock_recommendations: ShoppingCart,
  get_business_report: FileText,
  record_sale: ShoppingCart,
};

export default function AgentSteps({ steps }) {
  const hasSteps = steps && steps.length > 0;

  return (
    <div className="flex gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800">
        {hasSteps ? (
          <Database size={14} className="text-emerald-400" />
        ) : (
          <Sparkles size={14} className="text-gray-400" />
        )}
      </div>
      <div className="space-y-1.5 rounded-2xl rounded-tl-md bg-gray-800/50 px-4 py-3">
        {!hasSteps && (
          <div className="flex items-center gap-2 text-xs">
            <Loader2 size={12} className="animate-spin text-emerald-400" />
            <span className="text-emerald-400">Thinking...</span>
          </div>
        )}
        {hasSteps && steps.map((step, i) => {
          const Icon = TOOL_ICONS[step.tool] || Database;
          const isLatest = i === steps.length - 1 && step.type === 'status';

          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              {isLatest ? (
                <Loader2 size={12} className="animate-spin text-emerald-400" />
              ) : (
                <CheckCircle2 size={12} className="text-emerald-500" />
              )}
              <Icon size={12} className="text-gray-500" />
              <span className={isLatest ? 'text-emerald-400' : 'text-gray-500'}>
                {step.type === 'status' ? step.label : step.summary}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, IndianRupee, TrendingUp, RefreshCw, Sparkles, RotateCcw, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useProfile } from '../hooks/useProfile';
import { useAIInsights } from '../hooks/useAIInsights';
import StatsCard from '../components/StatsCard';
import SuggestionCard from '../components/SuggestionCard';
import InsightCard from '../components/InsightCard';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

export default function DashboardPage() {
  const { products, loading, addProduct, updateProduct } = useProducts();
  const { profile } = useProfile();
  const { insights, greeting: aiGreeting, tips, loading: insightsLoading } = useAIInsights();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dailyTip, setDailyTip] = useState(null);

  // Smart Restock
  const [restockRecs, setRestockRecs] = useState([]);
  const [loadingRestock, setLoadingRestock] = useState(false);

  // Demand Forecast
  const [forecast, setForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const isBusiness = profile?.userType === 'business';
  const shopName = profile?.businessName || 'Your Shop';

  const fetchSuggestions = async () => {
    if (!isBusiness || !profile?.businessType) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await api.post('/suggest-products', {
        business_type: profile.businessType,
        count: 10,
      });
      setSuggestions(data.products || []);
    } catch (err) {
      console.error('Suggestion fetch failed:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchDailyInsight = async () => {
    if (!isBusiness || !profile?.businessType || products.length === 0) return;
    try {
      const lowStock = products.filter((p) => p.quantity <= (p.threshold || 5));
      const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
      const { data } = await api.post('/daily-insight', {
        business_type: profile.businessType,
        product_count: products.length,
        low_stock_count: lowStock.length,
        top_categories: categories.slice(0, 5),
      });
      setDailyTip(data);
    } catch (err) {
      console.error('Daily insight failed:', err);
    }
  };

  useEffect(() => {
    if (isBusiness && suggestions.length === 0) fetchSuggestions();
  }, [isBusiness]);

  useEffect(() => {
    if (isBusiness && !loading && products.length > 0 && !dailyTip) fetchDailyInsight();
  }, [isBusiness, loading, products.length]);

  // Fetch Smart Restock
  const fetchRestock = async () => {
    setLoadingRestock(true);
    try {
      const { data } = await api.get('/smart-restock');
      setRestockRecs(data.recommendations || []);
    } catch (err) {
      console.error('Smart restock failed:', err);
    } finally {
      setLoadingRestock(false);
    }
  };

  // Fetch Demand Forecast
  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const { data } = await api.get('/demand-forecast', {
        params: { business_type: profile?.businessType || '' },
      });
      setForecast(data);
    } catch (err) {
      console.error('Demand forecast failed:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    if (isBusiness && !loading && products.length > 0) {
      fetchRestock();
      fetchForecast();
    }
  }, [isBusiness, loading, products.length]);

  const handleAddSuggestion = async (product) => {
    // Check if product already exists (by name, case-insensitive)
    const existing = products.find(
      (p) => p.name.toLowerCase() === product.name.toLowerCase()
    );
    if (existing) {
      // Increment quantity of existing product
      await updateProduct(existing.id, { quantity: (existing.quantity || 0) + 1 });
    } else {
      // Add new product with quantity 1
      await addProduct({
        name: product.name,
        category: product.category,
        quantity: 1,
        price: product.typical_price,
        threshold: 5,
        image: product.emoji,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalProducts = products.length;
  const lowStockItems = products.filter((p) => p.quantity <= (p.threshold || 5));
  const lowStockCount = lowStockItems.length;
  const topProducts = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const topProductName = topProducts[0]?.name?.split(' ')[0] || '\u2014';
  const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);

  return (
    <div className="space-y-6 px-4 pb-24 pt-6">
      {/* AI Greeting Card (business users) */}
      {isBusiness && (aiGreeting || dailyTip) ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">AI Assistant</span>
          </div>
          <h1 className="text-lg font-bold text-white">{shopName}</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            {dailyTip?.insight || aiGreeting || 'Welcome back! Here\'s your shop overview.'}
          </p>
          {dailyTip?.tip && (
            <p className="mt-2 text-xs text-emerald-400/80">
              Tip: {dailyTip.tip}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500">Welcome back,</p>
          <h1 className="text-xl font-bold">{isBusiness ? shopName : 'there'} {!isBusiness ? '\uD83D\uDC4B' : ''}</h1>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard icon={Package} label="Total Products" value={totalProducts} color="blue" />
        <StatsCard icon={AlertTriangle} label="Low Stock" value={lowStockCount} color="red" />
        <StatsCard icon={IndianRupee} label="Stock Value" value={`\u20B9${totalValue.toLocaleString()}`} color="emerald" />
        <StatsCard icon={TrendingUp} label="Top Product" value={topProductName} color="amber" />
      </div>

      {/* AI Insights (business only) */}
      {isBusiness && insights.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-400">AI Insights</h2>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <InsightCard key={i} icon={insight.icon} title={insight.title} description={insight.description} />
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions (business only) */}
      {isBusiness && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">AI Recommends for You</h2>
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-200"
            >
              <RefreshCw size={11} className={loadingSuggestions ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          {loadingSuggestions && suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {suggestions.map((product, i) => (
                <SuggestionCard key={i} product={product} onAdd={handleAddSuggestion} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* AI Smart Restock (business only) */}
      {isBusiness && (restockRecs.length > 0 || loadingRestock) && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
              <RotateCcw size={13} className="text-amber-400" />
              AI Restock Suggestions
            </h2>
            <button
              onClick={fetchRestock}
              disabled={loadingRestock}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-200"
            >
              <RefreshCw size={11} className={loadingRestock ? 'animate-spin' : ''} />
            </button>
          </div>
          {loadingRestock && restockRecs.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="space-y-2">
              {restockRecs.map((rec, i) => (
                <div key={i} className={`card flex items-center gap-3 py-3 ${
                  rec.urgency === 'critical' ? 'border-red-500/20' : rec.urgency === 'high' ? 'border-amber-500/20' : ''
                }`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    rec.urgency === 'critical' ? 'bg-red-500/15 text-red-400' :
                    rec.urgency === 'high' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-blue-500/15 text-blue-400'
                  }`}>
                    {rec.current_stock ?? '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rec.name}</p>
                    <p className="text-[10px] text-gray-500">{rec.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">+{rec.suggested_restock}</p>
                    <p className="text-[10px] text-gray-600">to order</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Demand Forecast (business only) */}
      {isBusiness && (forecast || loadingForecast) && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
              <Zap size={13} className="text-purple-400" />
              AI Demand Forecast
            </h2>
            <button
              onClick={fetchForecast}
              disabled={loadingForecast}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-200"
            >
              <RefreshCw size={11} className={loadingForecast ? 'animate-spin' : ''} />
            </button>
          </div>
          {loadingForecast && !forecast ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : forecast ? (
            <div className="space-y-3">
              {/* Trending Up */}
              {forecast.trending_up?.length > 0 && (
                <div className="card space-y-2">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <ArrowUp size={12} /> Trending Up This Week
                  </p>
                  {forecast.trending_up.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-500/5 px-3 py-2">
                      <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                        item.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                        item.confidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>{item.confidence}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending Down */}
              {forecast.trending_down?.length > 0 && (
                <div className="card space-y-2">
                  <p className="text-xs font-semibold text-red-400 flex items-center gap-1">
                    <ArrowDown size={12} /> May Slow Down
                  </p>
                  {forecast.trending_down.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-red-500/5 px-3 py-2">
                      <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-500">{item.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Opportunity + Tip */}
              {(forecast.opportunity || forecast.weekly_tip) && (
                <div className="card border-purple-500/20 space-y-2">
                  {forecast.opportunity && (
                    <p className="text-xs text-purple-300">
                      <span className="font-semibold">Opportunity:</span> {forecast.opportunity}
                    </p>
                  )}
                  {forecast.weekly_tip && (
                    <p className="text-xs text-gray-400">
                      <span className="font-semibold text-gray-300">Tip:</span> {forecast.weekly_tip}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card border-red-500/20">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-red-500/5 px-3 py-2">
                <span className="text-sm">{item.name}</span>
                <span className="badge-low">{item.quantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Top Products by Stock</h2>
          <div className="space-y-2">
            {topProducts.map((item, i) => (
              <div key={item.id} className="card flex items-center gap-3 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                <div className="flex-1 truncate text-sm">{item.name}</div>
                <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-400">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Add Product', icon: '\uD83D\uDCE6', path: '/inventory' },
            { label: 'Scan Bill', icon: '\uD83D\uDCF8', path: '/inventory' },
            { label: 'Ask AI', icon: '\uD83E\uDD16', path: '/chat' },
            { label: 'View Reports', icon: '\uD83D\uDCCA', path: '/analytics' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="card flex items-center gap-3 transition-colors hover:border-gray-700 active:bg-gray-800/50"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

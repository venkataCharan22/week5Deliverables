import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Package, AlertTriangle, IndianRupee, Layers, ShoppingCart, Clock, TrendingUp, Download, Sparkles, RefreshCw, CheckCircle, XCircle, Zap } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProducts } from '../hooks/useProducts';
import { useRentals } from '../hooks/useRentals';
import api from '../lib/api';

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || '#34d399' }}>
          {p.name}: {'\u20B9'}{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { products, loading } = useProducts();
  const { rentals } = useRentals();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // AI Business Report
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const { data } = await api.get('/business-report');
      setReport(data);
    } catch (err) {
      console.error('Business report failed:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Fetch transactions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/transactions', { params: { limit: 200 } });
        if (!cancelled) setTransactions(data.transactions || []);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-fetch report on load
  useEffect(() => {
    if (!loading && products.length > 0) fetchReport();
  }, [loading, products.length]);

  // ─── Computed stats ───
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStockItems = products.filter((p) => p.quantity <= (p.threshold || 5));
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
    const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalSales = transactions.length;
    const activeRentals = rentals.length;

    return { totalProducts, lowStockItems, totalValue, totalItems, totalRevenue, totalSales, activeRentals };
  }, [products, transactions, rentals]);

  // ─── Category breakdown ───
  const categories = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const cat = p.category || 'Other';
      if (!map[cat]) map[cat] = { count: 0, value: 0, items: 0 };
      map[cat].count += 1;
      map[cat].value += (p.price || 0) * (p.quantity || 0);
      map[cat].items += p.quantity || 0;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // ─── Sales by category ───
  const salesByCategory = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const cat = t.category || 'Other';
      if (!map[cat]) map[cat] = { name: cat, revenue: 0, count: 0 };
      map[cat].revenue += t.totalAmount || 0;
      map[cat].count += t.quantity || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

  // ─── Sales over time (last 7 days) ───
  const salesOverTime = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      days.push({ date: key, label, revenue: 0, count: 0 });
    }
    transactions.forEach((t) => {
      if (!t.createdAt) return;
      const key = t.createdAt.slice(0, 10);
      const day = days.find((d) => d.date === key);
      if (day) {
        day.revenue += t.totalAmount || 0;
        day.count += 1;
      }
    });
    return days;
  }, [transactions]);

  // ─── Top selling products ───
  const topSellers = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const name = t.productName || 'Unknown';
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += t.quantity || 0;
      map[name].revenue += t.totalAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [transactions]);

  // ─── Chart data ───
  const barData = categories.slice(0, 8).map((c) => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '...' : c.name,
    value: Math.round(c.value),
  }));

  const totalForPie = categories.reduce((s, c) => s + c.count, 0) || 1;
  const pieData = categories.map((c) => ({
    name: c.name,
    value: Math.round((c.count / totalForPie) * 100),
  }));

  // ─── Export ───
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizbuddy_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analytics</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-xl bg-gray-800 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
        >
          <Download size={13} />
          {exporting ? '...' : 'Export CSV'}
        </button>
      </div>

      {/* AI Business Report */}
      {(report || loadingReport) && (
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-400">AI Business Report</span>
            </div>
            <button
              onClick={fetchReport}
              disabled={loadingReport}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-200"
            >
              <RefreshCw size={11} className={loadingReport ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingReport && !report ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="sm" />
            </div>
          ) : report ? (
            <>
              {/* Health Score */}
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black ${
                  report.score >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                  report.score >= 40 ? 'bg-amber-500/15 text-amber-400' :
                  'bg-red-500/15 text-red-400'
                }`}>
                  {report.score}
                </div>
                <div>
                  <p className={`text-sm font-bold ${
                    report.score >= 70 ? 'text-emerald-400' : report.score >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>{report.score_label}</p>
                  <p className="text-xs text-gray-500">Business Health Score</p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm leading-relaxed text-gray-300">{report.summary}</p>

              {/* Highlights */}
              {report.highlights?.length > 0 && (
                <div className="space-y-1">
                  {report.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                      <p className="text-xs text-gray-400">{h}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Concerns */}
              {report.concerns?.length > 0 && (
                <div className="space-y-1">
                  {report.concerns.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <XCircle size={13} className="mt-0.5 shrink-0 text-red-400" />
                      <p className="text-xs text-gray-400">{c}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Items */}
              {report.actions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">This Week's Actions</p>
                  {report.actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Zap size={12} className="mt-0.5 shrink-0 text-amber-400" />
                      <p className="text-xs text-gray-300">{a}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard icon={Package} label="Products" value={stats.totalProducts} color="blue" />
        <StatsCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockItems.length} color="red" />
        <StatsCard icon={IndianRupee} label="Stock Value" value={`\u20B9${stats.totalValue.toLocaleString('en-IN')}`} color="emerald" />
        <StatsCard icon={Layers} label="Total Items" value={stats.totalItems.toLocaleString('en-IN')} color="amber" />
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <ShoppingCart size={18} className="mx-auto text-emerald-400" />
          <p className="mt-1 text-lg font-bold">{stats.totalSales}</p>
          <p className="text-[10px] text-gray-500">Total Sales</p>
        </div>
        <div className="card text-center py-3">
          <TrendingUp size={18} className="mx-auto text-emerald-400" />
          <p className="mt-1 text-lg font-bold">{'\u20B9'}{stats.totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-500">Revenue</p>
        </div>
        <div className="card text-center py-3">
          <Clock size={18} className="mx-auto text-blue-400" />
          <p className="mt-1 text-lg font-bold">{stats.activeRentals}</p>
          <p className="text-[10px] text-gray-500">Active Rentals</p>
        </div>
      </div>

      {/* Revenue Trend (Last 7 Days) */}
      {transactions.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold">Revenue — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={salesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `\u20B9${v / 1000}k` : `\u20B9${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stock Value by Category */}
      {barData.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold">Stock Value by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `\u20B9${v / 1000}k` : `\u20B9${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(52,211,153,0.05)' }} />
              <Bar dataKey="value" name="Value" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Selling Products */}
      {topSellers.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Top Selling Products</h2>
          <div className="space-y-2">
            {topSellers.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-[10px] text-gray-500">{item.qty} units sold</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{'\u20B9'}{item.revenue.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales by Category */}
      {salesByCategory.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Sales by Category</h2>
          <div className="space-y-2">
            {salesByCategory.map((cat) => {
              const pct = stats.totalRevenue > 0 ? Math.round((cat.revenue / stats.totalRevenue) * 100) : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{cat.name}</span>
                    <span className="text-xs font-medium">{'\u20B9'}{cat.revenue.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-800">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Rentals */}
      {rentals.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-blue-400" />
            Active Rentals
          </h2>
          <div className="space-y-2">
            {rentals.map((r) => {
              const now = new Date();
              const ret = r.returnDate instanceof Date ? r.returnDate : new Date(r.returnDate);
              const diff = ret - now;
              const hoursLeft = Math.round(diff / (60 * 60 * 1000));
              const isOverdue = diff < 0;
              return (
                <div key={r.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${isOverdue ? 'bg-red-500/10' : 'bg-gray-800/50'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.productName}</p>
                    <p className="text-[10px] text-gray-500">
                      {r.quantity}x &middot; {r.customerName || 'Customer'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${isOverdue ? 'text-red-400' : hoursLeft < 24 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {isOverdue ? `${Math.abs(hoursLeft)}h overdue` : hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.round(hoursLeft / 24)}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Distribution Pie */}
      {pieData.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold">Inventory Distribution</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-400 truncate max-w-[80px]">{item.name}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Details Table */}
      {categories.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Category Breakdown</h2>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.count} products, {cat.items} items</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{'\u20B9'}{cat.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {stats.lowStockItems.length > 0 && (
        <div className="card border-red-500/20">
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            Low Stock Alert
          </h2>
          <div className="space-y-2">
            {stats.lowStockItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-red-500/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-400">{p.quantity} left</p>
                  <p className="text-[10px] text-gray-600">threshold: {p.threshold || 5}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="card text-center py-8">
          <Package className="mx-auto h-10 w-10 text-gray-600" />
          <p className="mt-3 text-sm text-gray-500">Add products to see analytics</p>
        </div>
      )}
    </div>
  );
}

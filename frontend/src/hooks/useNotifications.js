import { useState, useEffect, useCallback } from 'react';
import { useRentals } from './useRentals';
import { useProfile } from './useProfile';
import { useProducts } from './useProducts';
import api from '../lib/api';

export function useNotifications() {
  const { rentals } = useRentals();
  const { profile } = useProfile();
  const { products } = useProducts();
  const [festivalInsights, setFestivalInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Fetch AI festival insights (cached for 6 hours)
  const fetchFestivalInsights = useCallback(async () => {
    if (!profile?.businessType) return;

    const cacheKey = 'bizbuddy_festival_insights';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const sixHours = 6 * 60 * 60 * 1000;
        if (Date.now() - timestamp < sixHours) {
          setFestivalInsights(data);
          return;
        }
      } catch { /* ignore */ }
    }

    setLoadingInsights(true);
    try {
      const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
      const { data } = await api.post('/festival-insights', {
        business_type: profile.businessType,
        top_categories: categories.slice(0, 5),
        product_count: products.length,
      });
      setFestivalInsights(data.notifications || []);
      localStorage.setItem(cacheKey, JSON.stringify({ data: data.notifications || [], timestamp: Date.now() }));
    } catch (err) {
      console.error('Festival insights error:', err);
    } finally {
      setLoadingInsights(false);
    }
  }, [profile?.businessType, products.length]);

  useEffect(() => {
    fetchFestivalInsights();
  }, [fetchFestivalInsights]);

  // Build notification list — ALL active rentals, not just urgent
  const notifications = [];

  const now = new Date();
  rentals.forEach((r) => {
    const diff = r.returnDate - now;
    const isOverdue = diff < 0;
    const absMins = Math.abs(Math.round(diff / (60 * 1000)));
    const absHours = Math.abs(Math.round(diff / (60 * 60 * 1000)));

    let timeStr;
    if (absMins < 60) {
      timeStr = `${absMins}m`;
    } else if (absHours < 24) {
      timeStr = `${absHours}h`;
    } else {
      timeStr = `${Math.round(absHours / 24)}d`;
    }

    let urgency;
    if (isOverdue) urgency = 'high';
    else if (diff < 60 * 60 * 1000) urgency = 'high'; // < 1 hour
    else if (diff < 24 * 60 * 60 * 1000) urgency = 'medium'; // < 24 hours
    else urgency = 'low';

    notifications.push({
      id: `rental-${r.id}`,
      type: 'rental',
      urgency,
      icon: isOverdue ? '🔴' : urgency === 'high' ? '🟠' : urgency === 'medium' ? '🟡' : '🔵',
      title: isOverdue ? `Overdue: ${r.productName}` : `Rented: ${r.productName}`,
      message: isOverdue
        ? `${r.quantity}x to ${r.customerName || 'customer'} — ${timeStr} overdue`
        : `${r.quantity}x to ${r.customerName || 'customer'} — ${timeStr} left`,
      rentalId: r.id,
      returnDate: r.returnDate,
    });
  });

  // Festival/seasonal insights
  festivalInsights.forEach((f, i) => {
    notifications.push({
      id: `festival-${i}`,
      type: 'festival',
      urgency: f.urgency || 'low',
      icon: f.icon || '📅',
      title: f.title,
      message: f.message,
      festivalName: f.festival_name,
      daysAway: f.days_away,
    });
  });

  // Sort: high first, then medium, then low
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  notifications.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

  const unreadCount = rentals.length + festivalInsights.filter((f) => f.urgency === 'high').length;

  return {
    notifications,
    unreadCount,
    rentals,
    festivalInsights,
    loadingInsights,
    refreshInsights: fetchFestivalInsights,
  };
}

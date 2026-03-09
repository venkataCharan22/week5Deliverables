import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MessageCircle,
  BarChart3,
  Image,
  LogOut,
  Bell,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/poster', icon: Image, label: 'Poster' },
];

export default function NavBar() {
  const { user, signOut } = useAuthContext();
  const { notifications, unreadCount } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const initial = user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?';
  const photoURL = user?.photoURL;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-300"
          >
            <div className="relative">
              <Bell size={20} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span>Alerts</span>
          </button>

          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-gray-800 transition-colors hover:border-gray-600"
            >
              {photoURL ? (
                <img src={photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-gray-300">{initial}</span>
              )}
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute bottom-12 right-0 z-50 w-48 animate-scale-in rounded-xl border border-gray-800 bg-gray-900 p-2 shadow-xl">
                  <p className="truncate px-2 py-1 text-xs text-gray-500">
                    {user?.email}
                  </p>
                  <button
                    onClick={() => { setShowMenu(false); signOut(); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onRentalReturned={() => {}}
        />
      )}
    </>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import { useAuthContext } from './contexts/AuthContext';
import { useProfile } from './hooks/useProfile';
import LoadingSpinner from './components/LoadingSpinner';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import AISetupPage from './pages/AISetupPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PosterPage from './pages/PosterPage';

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-20">
      {children}
      <NavBar />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuthContext();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function RequireOnboarding({ children }) {
  const { profile, loading } = useProfile();

  if (loading) return <FullScreenLoader />;
  if (!profile?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
      <Route path="/setup" element={<RequireAuth><AISetupPage /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><RequireOnboarding><AppLayout><DashboardPage /></AppLayout></RequireOnboarding></RequireAuth>} />
      <Route path="/inventory" element={<RequireAuth><RequireOnboarding><AppLayout><InventoryPage /></AppLayout></RequireOnboarding></RequireAuth>} />
      <Route path="/chat" element={<RequireAuth><RequireOnboarding><AppLayout><ChatPage /></AppLayout></RequireOnboarding></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><RequireOnboarding><AppLayout><AnalyticsPage /></AppLayout></RequireOnboarding></RequireAuth>} />
      <Route path="/poster" element={<RequireAuth><RequireOnboarding><AppLayout><PosterPage /></AppLayout></RequireOnboarding></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

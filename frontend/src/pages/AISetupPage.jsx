import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Brain, Package, Lightbulb, Sparkles, Rocket } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import api from '../lib/api';

const STEPS = [
  { label: 'Analyzing your business type...', icon: Brain, delay: 0 },
  { label: 'Curating your product catalog...', icon: Package, delay: 1500 },
  { label: 'Generating smart insights...', icon: Lightbulb, delay: 3000 },
  { label: 'Setting up your AI assistant...', icon: Sparkles, delay: 4500 },
  { label: 'Finalizing your shop...', icon: Rocket, delay: 6000 },
];

export default function AISetupPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { saveProfile } = useProfile();

  const businessType = state?.businessType || 'general';
  const businessName = state?.businessName || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [apiDone, setApiDone] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [showReady, setShowReady] = useState(false);
  const apiCalled = useRef(false);

  // Progress steps with timers
  useEffect(() => {
    const timers = STEPS.map((step, i) =>
      setTimeout(() => {
        setCurrentStep(i);
      }, step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Call API
  useEffect(() => {
    if (apiCalled.current || !user) return;
    apiCalled.current = true;

    api.post('/setup-shop', {
      business_type: businessType,
      business_name: businessName || undefined,
      user_id: user.uid,
    })
      .then((res) => {
        setSetupData(res.data);
        setApiDone(true);
      })
      .catch((err) => {
        console.error('Setup error:', err);
        setApiDone(true);
      });
  }, [user, businessType, businessName]);

  // When API done, rapidly complete all steps
  useEffect(() => {
    if (!apiDone) return;

    // Complete all steps rapidly
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps((prev) => new Set([...prev, i]));
        if (i === STEPS.length - 1) {
          setTimeout(() => setShowReady(true), 600);
        }
      }, i * 300);
    });
  }, [apiDone]);

  // Also mark steps as completed as they progress naturally (before API is done)
  useEffect(() => {
    if (currentStep > 0 && !apiDone) {
      const timer = setTimeout(() => {
        setCompletedSteps((prev) => new Set([...prev, currentStep - 1]));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStep, apiDone]);

  const handleContinue = async () => {
    await saveProfile({
      userType: 'business',
      businessType,
      businessName: businessName || null,
    });
    navigate('/dashboard', { replace: true });
  };

  // Find the business type emoji
  const typeEmojis = {
    grocery: '🛒', music_instruments: '🎸', bikes: '🏍️',
    gold_jewelry: '💎', electronics: '📱', clothing: '👕',
    pharmacy: '💊', hardware: '🔧', stationery: '📚', general: '🏪',
  };
  const emoji = typeEmojis[businessType] || '🏪';

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6">
      <div className="w-full max-w-sm">
        {/* Business Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 text-6xl animate-pulse">{emoji}</div>
          {businessName && (
            <h1 className="text-xl font-bold text-white">{businessName}</h1>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Setting up your AI-powered shop
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const isVisible = i <= currentStep || apiDone;
            const isCompleted = completedSteps.has(i);
            const isActive = i === currentStep && !isCompleted && !apiDone;
            const Icon = step.icon;

            if (!isVisible) return <div key={i} className="h-10" />;

            return (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 scale-110'
                      : isActive
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-gray-800/50 text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isCompleted ? 'text-emerald-400' : isActive ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ready State */}
        {showReady && (
          <div className="mt-10 animate-fade-slide-up text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <Sparkles className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Your shop is ready!</h2>
            {setupData?.welcome_message && (
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                {setupData.welcome_message}
              </p>
            )}
            {setupData?.suggested_products?.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                {setupData.suggested_products.length} products added to your inventory
              </p>
            )}
            <button
              onClick={handleContinue}
              className="btn-primary mt-6 w-full"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, ArrowRight, Sparkles } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { BUSINESS_TYPES } from '../lib/businessTypes';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState(null);
  const [businessType, setBusinessType] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);
  const { saveProfile } = useProfile();
  const navigate = useNavigate();

  const totalSteps = userType === 'business' ? 3 : 1;

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (userType === 'business') {
        // Go to AI setup screen — profile will be saved after setup completes
        navigate('/setup', {
          replace: true,
          state: { businessType, businessName: businessName.trim() || null },
        });
      } else {
        // Personal users skip AI setup
        await saveProfile({
          userType: 'personal',
          businessType: null,
          businessName: null,
        });
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaving(false);
    }
  };

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    if (type === 'personal') {
      // Skip to finish directly
    } else {
      setStep(2);
    }
  };

  const handleNext = () => {
    if (step === 2 && businessType) {
      setStep(3);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-6 py-8">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 <= step ? 'w-8 bg-emerald-400' : 'w-4 bg-gray-800'
            }`}
          />
        ))}
      </div>

      {/* Step 1: User Type */}
      {step === 1 && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Sparkles size={24} className="text-emerald-400" />
          </div>
          <h1 className="mb-1 text-2xl font-bold">Welcome to BizBuddy AI</h1>
          <p className="mb-10 text-center text-sm text-gray-500">
            Your smart inventory & business assistant
          </p>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={() => handleUserTypeSelect('business')}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                userType === 'business'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                <Store size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold">Small Business</p>
                <p className="text-xs text-gray-500">
                  AI recommendations, smart categories, tailored insights
                </p>
              </div>
            </button>

            <button
              onClick={() => handleUserTypeSelect('personal')}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                userType === 'personal'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                <User size={22} className="text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">Personal Use</p>
                <p className="text-xs text-gray-500">
                  Simple inventory tracking without AI suggestions
                </p>
              </div>
            </button>
          </div>

          {userType === 'personal' && (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary mt-8 flex items-center gap-2 px-8 py-3"
            >
              {saving ? <LoadingSpinner size="sm" /> : (
                <>Get Started <ArrowRight size={16} /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Step 2: Business Type */}
      {step === 2 && (
        <div className="flex flex-1 flex-col pt-10">
          <h1 className="mb-1 text-xl font-bold">What do you sell?</h1>
          <p className="mb-6 text-sm text-gray-500">
            We'll tailor your experience with smart categories and product suggestions
          </p>

          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setBusinessType(type.id)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                  businessType === type.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <span className="text-3xl">{type.emoji}</span>
                <span className="text-center text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <button
              onClick={handleNext}
              disabled={!businessType}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Business Name */}
      {step === 3 && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-2 text-5xl">
            {BUSINESS_TYPES.find((t) => t.id === businessType)?.emoji}
          </div>
          <h1 className="mb-1 text-xl font-bold">Name your shop</h1>
          <p className="mb-8 text-sm text-gray-500">Optional — you can change this later</p>

          <div className="w-full max-w-sm">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Krishna Music Store"
              className="input w-full py-3 text-center text-lg"
              autoFocus
            />
          </div>

          <div className="mt-8 flex w-full max-w-sm gap-3">
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-secondary flex-1 py-3"
            >
              Skip
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary flex flex-1 items-center justify-center gap-2 py-3"
            >
              {saving ? <LoadingSpinner size="sm" /> : (
                <>Let's Go <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

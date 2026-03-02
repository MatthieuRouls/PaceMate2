'use client';

import { useState, useRef, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { StepProps, validateStep3, canSkipStep } from './onboarding.types';

export default function StepPhone({
  data,
  updateData,
  onNext,
  onBack,
  isLoading,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!data.phoneNumber || data.phoneNumber.length < 10) {
      setErrors({ phoneNumber: 'Numero de telephone requis' });
      return;
    }

    setSendingOtp(true);
    // Simulate OTP sending
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSendingOtp(false);
    setOtpSent(true);
    setCountdown(60);
    updateData({ otpCode: '' });
  };

  const handleVerifyOtp = async () => {
    if (data.otpCode.length !== 6) {
      setErrors({ otpCode: 'Code a 6 chiffres requis' });
      return;
    }

    // Simulate verification (in production, call API)
    // For demo, any 6-digit code works
    updateData({ phoneVerified: true });
    onNext();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      updateData({ otpCode: digits });
      if (digits.length === 6) {
        otpInputRefs.current[5]?.focus();
      }
      return;
    }

    const newOtp = data.otpCode.split('');
    newOtp[index] = value;
    const newOtpString = newOtp.join('').slice(0, 6);
    updateData({ otpCode: newOtpString });

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !data.otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleNext = () => {
    const validation = validateStep3(data);
    if (validation.isValid) {
      setErrors({});
      onNext();
    } else {
      setErrors(validation.errors);
    }
  };

  const handleSkip = () => {
    updateData({ phoneVerified: false, phoneNumber: '', otpCode: '' });
    onNext();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Verification telephone</h2>
        <p className="text-gray-500">Renforcez la securite de votre compte</p>
      </div>

      {/* Badge Preview */}
      {data.phoneVerified && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-50 rounded-xl border border-green-200 animate-scaleIn">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-semibold text-green-700">Profil confirme</span>
        </div>
      )}

      {/* Phone Input */}
      {!otpSent && !data.phoneVerified && (
        <div className="space-y-4">
          <Input
            label="Numero de telephone"
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={data.phoneNumber}
            onChange={(e) => updateData({ phoneNumber: e.target.value })}
            error={errors.phoneNumber}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
          />

          <Button
            onClick={handleSendOtp}
            fullWidth
            variant="primary"
            size="lg"
            loading={sendingOtp}
          >
            Envoyer le code
          </Button>
        </div>
      )}

      {/* OTP Input */}
      {otpSent && !data.phoneVerified && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Code envoye au <span className="font-semibold">{data.phoneNumber}</span>
          </p>

          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => { otpInputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={data.otpCode[index] || ''}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={`
                  w-12 h-14 text-center text-xl font-bold
                  border-2 rounded-xl
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                  ${errors.otpCode ? 'border-red-400' : 'border-gray-300'}
                `}
              />
            ))}
          </div>

          {errors.otpCode && (
            <p className="text-sm text-red-600 text-center">{errors.otpCode}</p>
          )}

          <Button
            onClick={handleVerifyOtp}
            fullWidth
            variant="gradient"
            size="lg"
            loading={isLoading}
            disabled={data.otpCode.length !== 6}
          >
            Verifier
          </Button>

          <p className="text-sm text-center text-gray-500">
            {countdown > 0 ? (
              <>Renvoyer dans {countdown}s</>
            ) : (
              <button
                onClick={handleSendOtp}
                className="text-blue-600 hover:underline"
              >
                Renvoyer le code
              </button>
            )}
          </p>
        </div>
      )}

      {/* Already Verified - Continue */}
      {data.phoneVerified && (
        <Button
          onClick={onNext}
          fullWidth
          variant="gradient"
          size="lg"
        >
          Continuer
        </Button>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="lg"
          className="flex-1"
        >
          Retour
        </Button>
        {canSkipStep(3) && !data.phoneVerified && (
          <Button
            onClick={handleSkip}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Plus tard
          </Button>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-gray-400">
        La verification renforce la confiance entre coureurs
      </p>
    </div>
  );
}

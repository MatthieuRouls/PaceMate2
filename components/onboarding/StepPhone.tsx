'use client';

import { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!data.phoneNumber || data.phoneNumber.length < 10) {
      setErrors({ phoneNumber: 'Numéro de téléphone requis' });
      return;
    }
    setSendingOtp(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSendingOtp(false);
    setOtpSent(true);
    setCountdown(60);
    updateData({ otpCode: '' });
  };

  const handleVerifyOtp = async () => {
    if (data.otpCode.length !== 6) {
      setErrors({ otpCode: 'Code à 6 chiffres requis' });
      return;
    }
    updateData({ phoneVerified: true });
    onNext();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      updateData({ otpCode: digits });
      if (digits.length === 6) otpInputRefs.current[5]?.focus();
      return;
    }
    const newOtp = data.otpCode.split('');
    newOtp[index] = value;
    updateData({ otpCode: newOtp.join('').slice(0, 6) });
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !data.otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSkip = () => {
    updateData({ phoneVerified: false, phoneNumber: '', otpCode: '' });
    onNext();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-neon-500 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-dark-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-dark-800">Vérification</h2>
        <p className="text-dark-500 text-sm">Renforcez la confiance de votre profil</p>
      </div>

      {/* Verified badge */}
      {data.phoneVerified && (
        <div className="flex items-center gap-3 py-3 px-4 bg-neon-50 rounded-xl border border-neon-200 animate-scaleIn">
          <div className="w-8 h-8 rounded-full bg-neon-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-dark-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-dark-800 text-sm">Profil confirmé</p>
            <p className="text-xs text-neon-700">{data.phoneNumber}</p>
          </div>
        </div>
      )}

      {/* Phone input */}
      {!otpSent && !data.phoneVerified && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-1.5">
              Numéro de téléphone
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={data.phoneNumber}
                onChange={(e) => updateData({ phoneNumber: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                  transition-all duration-200 outline-none
                  focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                  ${errors.phoneNumber ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 bg-white hover:border-silver-400'}`}
              />
            </div>
            {errors.phoneNumber && <p className="mt-1 text-xs text-pink-500">{errors.phoneNumber}</p>}
          </div>

          <button
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full py-3 rounded-xl bg-neon-500 text-dark-800 font-semibold text-sm
              hover:bg-neon-400 active:scale-[0.99] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {sendingOtp ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : 'Envoyer le code'}
          </button>
        </div>
      )}

      {/* OTP input */}
      {otpSent && !data.phoneVerified && (
        <div className="space-y-4 animate-fadeIn">
          <p className="text-sm text-dark-500 text-center">
            Code envoyé au <span className="font-semibold text-dark-800">{data.phoneNumber}</span>
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
                  w-11 h-13 text-center text-xl font-bold
                  border-2 rounded-xl outline-none
                  transition-all duration-200
                  focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                  ${errors.otpCode ? 'border-pink-400' : data.otpCode[index] ? 'border-neon-500 bg-neon-50' : 'border-silver-300'}
                `}
              />
            ))}
          </div>

          {errors.otpCode && <p className="text-xs text-pink-500 text-center">{errors.otpCode}</p>}

          <button
            onClick={handleVerifyOtp}
            disabled={data.otpCode.length !== 6 || isLoading}
            className="w-full py-3 rounded-xl bg-neon-500 text-dark-800 font-semibold text-sm
              hover:bg-neon-400 active:scale-[0.99] transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Vérifier
          </button>

          <p className="text-xs text-center text-dark-400">
            {countdown > 0 ? (
              <>Renvoyer dans {countdown}s</>
            ) : (
              <button onClick={handleSendOtp} className="text-neon-700 hover:underline">
                Renvoyer le code
              </button>
            )}
          </p>
        </div>
      )}

      {/* Verified — continue */}
      {data.phoneVerified && (
        <button
          onClick={onNext}
          className="w-full py-3 rounded-xl bg-dark-800 text-neon-500 font-semibold text-sm
            hover:bg-dark-700 active:scale-[0.99] transition-all duration-200
            flex items-center justify-center gap-2"
        >
          Continuer
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Footer buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-silver-300 text-dark-700 font-medium text-sm
            hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
        >
          Retour
        </button>
        {canSkipStep(3) && !data.phoneVerified && !otpSent && (
          <button
            onClick={handleSkip}
            className="flex-1 py-3 rounded-xl border border-silver-300 text-dark-500 font-medium text-sm
              hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
          >
            Plus tard
          </button>
        )}
      </div>

      <p className="text-xs text-center text-dark-400">
        La vérification renforce la confiance entre coureurs
      </p>
    </div>
  );
}

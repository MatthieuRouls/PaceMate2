'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, Check } from 'lucide-react';
import { StepProps } from './onboarding.types';

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Vérification du numéro</h2>
        <p className="text-dark-500 text-sm">Renforce la confiance de ton profil — optionnel</p>
      </div>

      {/* Verified badge */}
      {data.phoneVerified && (
        <div className="flex items-center gap-3 p-4 bg-neon-50 rounded-lg border border-neon-200">
          <div className="w-8 h-8 rounded-full bg-neon-700 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-dark-800 text-sm">Numéro vérifié</p>
            <p className="text-xs text-dark-500">{data.phoneNumber}</p>
          </div>
        </div>
      )}

      {/* Phone input */}
      {!otpSent && !data.phoneVerified && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-dark-800 mb-2">Numéro de téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={data.phoneNumber}
                onChange={(e) => updateData({ phoneNumber: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all text-dark-800 placeholder-silver-500 text-sm
                  focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700
                  ${errors.phoneNumber ? 'border-pink-400 bg-pink-50/30' : 'border-silver-400 hover:border-silver-500'}`}
              />
            </div>
            {errors.phoneNumber && <p className="mt-1 text-xs text-pink-600">{errors.phoneNumber}</p>}
          </div>
          <button
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
              hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {sendingOtp ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : 'Envoyer le code'}
          </button>
        </div>
      )}

      {/* OTP input */}
      {otpSent && !data.phoneVerified && (
        <div className="space-y-4">
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
                className={`w-11 h-12 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all
                  focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700
                  ${errors.otpCode ? 'border-pink-400' : data.otpCode[index] ? 'border-neon-700 bg-neon-50' : 'border-silver-400'}`}
              />
            ))}
          </div>
          {errors.otpCode && <p className="text-xs text-pink-600 text-center">{errors.otpCode}</p>}
          <button
            onClick={handleVerifyOtp}
            disabled={data.otpCode.length !== 6 || isLoading}
            className="w-full py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
              hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
            hover:bg-dark-700 transition-colors"
        >
          Continuer
        </button>
      )}

      {/* Footer */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 font-medium text-sm
            hover:border-silver-500 hover:bg-silver-50 transition-colors"
        >
          Retour
        </button>
        {!data.phoneVerified && !otpSent && (
          <button
            onClick={onNext}
            className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-500 font-medium text-sm
              hover:border-silver-500 hover:bg-silver-50 transition-colors"
          >
            Plus tard
          </button>
        )}
      </div>
    </div>
  );
}

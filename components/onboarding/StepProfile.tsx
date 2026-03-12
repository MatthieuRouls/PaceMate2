'use client';

import { useState, useRef } from 'react';
import { StepProps, validateStep2 } from './onboarding.types';

export default function StepProfile({
  data,
  updateData,
  onNext,
  onBack,
  isLoading,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    const validation = validateStep2(data);
    if (validation.isValid) {
      setErrors({});
      onNext();
    } else {
      setErrors(validation.errors);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      updateData({ photoFile: file, photoUrl: url });
      setErrors((prev) => ({ ...prev, photo: '' }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-dark-800">Votre profil</h2>
        <p className="text-dark-500 text-sm">Une photo aide les autres coureurs à vous reconnaître</p>
      </div>

      {/* Photo upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-dark-700">
            Photo de profil
          </label>
          <span className="text-xs font-medium text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
            Obligatoire
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview circle */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              relative w-24 h-24 rounded-full cursor-pointer flex-shrink-0
              border-2 border-dashed overflow-hidden
              transition-all duration-300
              ${data.photoUrl
                ? 'border-neon-500'
                : isDragging
                ? 'border-neon-500 bg-neon-50 scale-105'
                : errors.photo
                ? 'border-pink-400 bg-pink-50/30'
                : 'border-silver-300 bg-silver-50 hover:border-neon-500 hover:bg-neon-50/30'
              }
            `}
          >
            {data.photoUrl ? (
              <>
                <img
                  src={data.photoUrl}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-dark-800/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">Changer</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <svg className="w-7 h-7 text-silver-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload hint */}
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-silver-300 text-dark-700 text-sm font-medium
                hover:border-neon-500 hover:bg-neon-50/30 transition-all duration-200 text-left"
            >
              {data.photoUrl ? '📷 Changer la photo' : '📷 Choisir une photo'}
            </button>
            <p className="text-xs text-dark-400 mt-1.5 pl-1">
              JPG, PNG · Max 2 Mo
            </p>
            {errors.photo && (
              <p className="text-xs text-pink-500 mt-1 pl-1">{errors.photo}</p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
      </div>

      {/* Name & City */}
      <div className="space-y-4">
        {/* First name */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">
            Prénom <span className="text-pink-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Votre prénom"
              value={data.firstName}
              onChange={(e) => updateData({ firstName: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                transition-all duration-200 outline-none
                focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                ${errors.firstName ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 bg-white hover:border-silver-400'}`}
            />
          </div>
          {errors.firstName && <p className="mt-1 text-xs text-pink-500">{errors.firstName}</p>}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">
            Ville
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Paris, Lyon, Marseille..."
              value={data.city}
              onChange={(e) => updateData({ city: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                transition-all duration-200 outline-none
                focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                ${errors.city ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 bg-white hover:border-silver-400'}`}
            />
          </div>
          {errors.city && <p className="mt-1 text-xs text-pink-500">{errors.city}</p>}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-silver-300 text-dark-700 font-medium text-sm
            hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
        >
          Retour
        </button>
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="flex-[2] py-3 rounded-xl bg-dark-800 text-neon-500 font-semibold text-sm
            hover:bg-dark-700 active:scale-[0.99] transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              Continuer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

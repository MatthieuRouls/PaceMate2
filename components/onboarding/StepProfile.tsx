'use client';

import { useState, useRef } from 'react';
import { Camera, User, MapPin, AlertCircle } from 'lucide-react';
import { StepProps, validateStep1 } from './onboarding.types';

export default function StepProfile({
  data,
  updateData,
  onNext,
  isLoading,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    const validation = validateStep1(data);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Complète ton profil</h2>
        <p className="text-dark-500 text-sm">Une photo aide les autres coureurs à te reconnaître</p>
      </div>

      {/* Photo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-800">Photo de profil</label>
          <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
            Obligatoire
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-20 h-20 rounded-2xl cursor-pointer flex-shrink-0 overflow-hidden border-2 transition-all ${
              data.photoUrl
                ? 'border-neon-700'
                : errors.photo
                ? 'border-pink-400 bg-pink-50'
                : 'border-dashed border-silver-400 bg-silver-50 hover:border-neon-700 hover:bg-neon-50/30'
            }`}
          >
            {data.photoUrl ? (
              <>
                <img src={data.photoUrl} alt="Aperçu" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-dark-800/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-6 h-6 text-silver-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-700 text-neon-700 text-sm font-medium hover:bg-neon-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {data.photoUrl ? 'Changer la photo' : 'Choisir une photo'}
            </button>
            <p className="text-xs text-dark-500 mt-1.5">JPG, PNG · Max 2 Mo</p>
            {errors.photo && (
              <p className="flex items-center gap-1 text-xs text-pink-600 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.photo}
              </p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          className="hidden"
        />
      </div>

      {/* Prénom */}
      <div>
        <label className="block text-sm font-medium text-dark-800 mb-2">
          Prénom <span className="text-pink-600">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Ton prénom"
            value={data.firstName}
            onChange={(e) => updateData({ firstName: e.target.value })}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all text-dark-800 placeholder-silver-500 text-sm
              focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700
              ${errors.firstName ? 'border-pink-400 bg-pink-50/30' : 'border-silver-400 hover:border-silver-500'}`}
          />
        </div>
        {errors.firstName && (
          <p className="flex items-center gap-1 text-xs text-pink-600 mt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.firstName}
          </p>
        )}
      </div>

      {/* Ville */}
      <div>
        <label className="block text-sm font-medium text-dark-800 mb-2">Ville</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Paris, Lyon, Marseille..."
            value={data.city}
            onChange={(e) => updateData({ city: e.target.value })}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-silver-400 outline-none transition-all text-dark-800 placeholder-silver-500 text-sm
              focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700 hover:border-silver-500"
          />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
          hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continuer
      </button>
    </div>
  );
}

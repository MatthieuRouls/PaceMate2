'use client';

import { useState, useRef } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Votre profil</h2>
        <p className="text-gray-500">Une photo aide les autres coureurs a vous reconnaitre</p>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          Photo de profil <span className="text-red-500">*</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative w-full aspect-square max-w-[200px] mx-auto
            rounded-full border-3 border-dashed cursor-pointer
            transition-all duration-300 overflow-hidden
            ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'}
            ${errors.photo ? 'border-red-400 bg-red-50' : ''}
          `}
        >
          {data.photoUrl ? (
            <>
              <img
                src={data.photoUrl}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Changer</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm text-gray-500 text-center">Cliquez ou deposez une photo</span>
            </div>
          )}
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
        {errors.photo && (
          <p className="text-sm text-red-600 text-center">{errors.photo}</p>
        )}
      </div>

      {/* Name & City */}
      <div className="space-y-4">
        <Input
          label="Prenom"
          type="text"
          placeholder="Votre prenom"
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
          error={errors.firstName}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <Input
          label="Ville"
          type="text"
          placeholder="Paris, Lyon, Marseille..."
          value={data.city}
          onChange={(e) => updateData({ city: e.target.value })}
          error={errors.city}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

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
        <Button
          onClick={handleNext}
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="flex-[2]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}

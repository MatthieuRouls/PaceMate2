'use client';

import { ReactNode } from 'react';

interface PhoneMockupProps {
  screenshot?: ReactNode;
  className?: string;
}

export default function PhoneMockup({ screenshot, className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-blue-500/20 blur-3xl rounded-full animate-pulse" />

      {/* Phone frame */}
      <div className="relative animate-float">
        <div className="relative mx-auto w-[300px] h-[600px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10" />

          {/* Screen */}
          <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
            {screenshot ? (
              screenshot
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-blue-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2">PaceMate</h3>
                  <p className="text-sm text-gray-600">Trouve ton binôme de course</p>
                </div>
              </div>
            )}
          </div>

          {/* Side buttons */}
          <div className="absolute -right-1 top-28 w-1 h-12 bg-gray-800 rounded-l" />
          <div className="absolute -right-1 top-44 w-1 h-16 bg-gray-800 rounded-l" />
          <div className="absolute -left-1 top-32 w-1 h-8 bg-gray-800 rounded-r" />
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

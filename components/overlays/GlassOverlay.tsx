'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft } from 'lucide-react';

interface GlassOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: 'right' | 'center' | 'fullscreen';
  width?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
}

export default function GlassOverlay({
  isOpen,
  onClose,
  children,
  title,
  position = 'right',
  width = 'max-w-lg',
  showBackButton = false,
  showCloseButton = true
}: GlassOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus first element
    setTimeout(() => {
      const first = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (first) {
        first.focus();
      } else {
        panelRef.current?.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  // Don't render anything during SSR or before mount
  if (!mounted) return null;

  const positionClasses = {
    right: `fixed top-0 right-0 h-full w-full ${width} transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`,
    center: `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full ${width} max-h-[90vh] transition-all duration-300 ease-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`,
    fullscreen: `fixed inset-0 transform transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
  };

  const content = (
    <>
      {/* Glass Backdrop - dashboard visible through blur */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: isOpen ? 'blur(8px) saturate(1.2)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(8px) saturate(1.2)' : 'blur(0px)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        tabIndex={-1}
        className={`z-50 bg-white shadow-2xl outline-none overflow-hidden ${positionClasses[position]} ${position === 'right' ? 'border-l border-silver-200' : position === 'center' ? 'rounded-2xl mx-4' : ''}`}
      >
        {/* Header */}
        {(title || showBackButton || showCloseButton) && (
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-silver-200 bg-white/95 backdrop-blur-sm">
            {showBackButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-silver-100:bg-dark-600 transition-colors -ml-2"
                aria-label="Retour"
              >
                <ChevronLeft className="w-6 h-6 text-dark-600" />
              </button>
            )}

            {title && (
              <h2 className="flex-1 text-lg font-bold text-dark-800">{title}</h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-silver-100:bg-dark-600 transition-colors ml-auto"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-dark-500" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`overflow-y-auto ${position === 'fullscreen' ? 'h-[calc(100%-64px)]' : position === 'right' ? 'h-[calc(100%-64px)]' : ''}`}>
          {children}
        </div>
      </div>
    </>
  );

  // Render via portal to overlay root
  const container = document.getElementById('overlay-root') || document.body;
  return createPortal(content, container);
}

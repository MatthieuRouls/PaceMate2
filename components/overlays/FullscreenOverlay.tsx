'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import OverlayPortal from './OverlayPortal';

interface FullscreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  className?: string;
  contentClassName?: string;
  onBack?: () => void;
}

export default function FullscreenOverlay({
  isOpen,
  onClose,
  children,
  title,
  showBackButton = false,
  showCloseButton = true,
  headerContent,
  footerContent,
  className = '',
  contentClassName = '',
  onBack
}: FullscreenOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && overlayRef.current) {
      const focusableElements = overlayRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  // Lock body scroll and handle focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      setTimeout(() => {
        const firstFocusable = overlayRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          overlayRef.current?.focus();
        }
      }, 100);

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
        document.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <OverlayPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-dark-900/70 backdrop-blur-sm z-50 animate-fadeIn"
        aria-hidden="true"
      />

      {/* Overlay container */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Overlay'}
        tabIndex={-1}
        className={`
          fixed inset-0 z-50
          flex flex-col
          bg-neu-base dark:bg-dark-900
          animate-slideUp
          outline-none
          ${className}
        `}
      >
        {/* Header */}
        <header className="shrink-0 px-4 md:px-6 py-4 border-b border-silver-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <div className="max-w-[1160px] mx-auto flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={onBack || onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors"
                aria-label="Retour"
              >
                <ChevronLeft className="w-6 h-6 text-dark-600 dark:text-silver-300" />
              </button>
            )}

            {title && (
              <h1 className="text-lg font-bold text-dark-800 dark:text-white flex-1">{title}</h1>
            )}

            {headerContent && (
              <div className="flex-1">{headerContent}</div>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors ml-auto"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-dark-600 dark:text-silver-300" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}>
          {children}
        </main>

        {/* Footer */}
        {footerContent && (
          <footer className="shrink-0 px-4 md:px-6 py-4 border-t border-silver-200 dark:border-dark-700 bg-white dark:bg-dark-800">
            <div className="max-w-[1160px] mx-auto">
              {footerContent}
            </div>
          </footer>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.26s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </OverlayPortal>
  );
}

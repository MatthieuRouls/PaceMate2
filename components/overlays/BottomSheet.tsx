'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import OverlayPortal from './OverlayPortal';
import Backdrop from './Backdrop';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'h-[85vh]',
  showHandle = true,
  showCloseButton = true,
  className = ''
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && sheetRef.current) {
      const focusableElements = sheetRef.current.querySelectorAll(
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

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);

      setTimeout(() => {
        const firstFocusable = sheetRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          sheetRef.current?.focus();
        }
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  return (
    <OverlayPortal>
      <Backdrop isOpen={isOpen} onClose={onClose} zIndex={50} />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        tabIndex={-1}
        className={`
          fixed bottom-0 left-0 right-0 ${height} max-h-[90vh]
          bg-white dark:bg-dark-800
          rounded-t-2xl
          shadow-2xl
          transform transition-transform duration-[260ms]
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          z-50
          flex flex-col
          outline-none
          ${className}
        `}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-silver-300 dark:bg-dark-600" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-silver-200 dark:border-dark-600 shrink-0">
            {title && (
              <h2 className="text-lg font-bold text-dark-800 dark:text-white">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors ml-auto"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-dark-500" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import OverlayPortal from './OverlayPortal';
import Backdrop from './Backdrop';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: string;
  side?: 'left' | 'right';
  showCloseButton?: boolean;
  className?: string;
}

export default function SidePanel({
  isOpen,
  onClose,
  children,
  title,
  width = 'w-[480px]',
  side = 'right',
  showCloseButton = true,
  className = ''
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
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

      // Focus first focusable element or panel itself
      setTimeout(() => {
        const firstFocusable = panelRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          panelRef.current?.focus();
        }
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  const translateClass = side === 'right'
    ? (isOpen ? 'translate-x-0' : 'translate-x-full')
    : (isOpen ? 'translate-x-0' : '-translate-x-full');

  const positionClass = side === 'right' ? 'right-0' : 'left-0';

  return (
    <OverlayPortal>
      <Backdrop isOpen={isOpen} onClose={onClose} zIndex={50} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        tabIndex={-1}
        className={`
          fixed top-0 ${positionClass} h-full ${width} max-w-full
          bg-white dark:bg-dark-800
          shadow-2xl
          transform transition-transform duration-[260ms]
          ${translateClass}
          z-50
          flex flex-col
          outline-none
          ${className}
        `}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-silver-200 dark:border-dark-600 shrink-0">
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

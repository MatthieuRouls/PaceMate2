'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react';
import OverlayPortal from './OverlayPortal';
import Backdrop from './Backdrop';

type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: ConfirmType;
  icon?: 'delete' | 'leave' | 'warning';
  loading?: boolean;
}

const typeStyles = {
  danger: {
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600',
    buttonBg: 'bg-pink-600 hover:bg-pink-700'
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700'
  },
  info: {
    iconBg: 'bg-neon-100 dark:bg-neon-900/30',
    iconColor: 'text-neon-700',
    buttonBg: 'bg-neon-700 hover:bg-neon-600'
  }
};

const icons = {
  delete: Trash2,
  leave: LogOut,
  warning: AlertTriangle
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  type = 'danger',
  icon = 'warning',
  loading = false
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button:not([disabled])'
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

      // Focus cancel button by default (safer option)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const styles = typeStyles[type];
  const IconComponent = icons[icon];

  return (
    <OverlayPortal>
      <Backdrop isOpen={isOpen} onClose={onClose} zIndex={70} />

      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          className="w-full max-w-sm bg-white dark:bg-dark-800 rounded-2xl shadow-2xl pointer-events-auto animate-confirmIn outline-none"
        >
          <div className="p-6 text-center">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className={`w-7 h-7 ${styles.iconColor}`} />
            </div>

            {/* Title */}
            <h2 id="confirm-title" className="text-lg font-bold text-dark-800 dark:text-white mb-2">
              {title}
            </h2>

            {/* Message */}
            <p id="confirm-message" className="text-sm text-dark-500 dark:text-silver-400 mb-6">
              {message}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-dark-600 dark:text-silver-300 bg-silver-100 dark:bg-dark-700 hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${styles.buttonBg} transition-colors disabled:opacity-50`}
              >
                {loading ? 'Chargement...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes confirmIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-confirmIn {
          animation: confirmIn 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .z-70 {
          z-index: 70;
        }
      `}</style>
    </OverlayPortal>
  );
}

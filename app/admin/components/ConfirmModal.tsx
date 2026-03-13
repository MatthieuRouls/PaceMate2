'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Trash2, ShieldOff, Info, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const VARIANT_STYLES: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  confirmBtn: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    confirmBtn: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

interface ConfirmModalProps {
  state: ConfirmState | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ state, onConfirm, onCancel }: ConfirmModalProps) {
  if (!state) return null;

  const variant = state.variant ?? 'danger';
  const { icon: Icon, iconBg, iconColor, confirmBtn } = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-900 mb-2 pr-6">{state.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{state.message}</p>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${confirmBtn}`}
          >
            {state.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook providing an imperative confirm() API with a custom modal.
 *
 * Usage:
 *   const { confirm, ConfirmModalNode } = useConfirmModal();
 *   // In JSX: {ConfirmModalNode}
 *   // In handler: if (!await confirm({ title: '...', message: '...' })) return;
 */
export function useConfirmModal() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const ConfirmModalNode = (
    <ConfirmModal state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
  );

  return { confirm, ConfirmModalNode };
}

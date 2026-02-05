import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    'level-1': 'bg-sand-100 text-sand-600 border border-sand-200',
    'level-2': 'bg-sand-200 text-sand-700 border border-sand-300',
    'level-3': 'bg-terra-100 text-terra-600 border border-terra-200',
    'level-4': 'bg-rust-100 text-rust-600 border border-rust-200',
    'level-5': 'bg-rust-200 text-rust-700 border border-rust-300',
    primary: 'bg-petrol-100 text-petrol-700 border border-petrol-200',
    success: 'bg-petrol-100 text-petrol-700 border border-petrol-200',
    warning: 'bg-sand-100 text-sand-600 border border-sand-200',
    danger: 'bg-rust-100 text-rust-600 border border-rust-200',
    info: 'bg-silver-200 text-dark-700 border border-silver-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-semibold rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

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
    'level-1': 'bg-silver-100 text-silver-600 border border-silver-200',
    'level-2': 'bg-silver-200 text-silver-700 border border-silver-300',
    'level-3': 'bg-neon-100 text-neon-600 border border-neon-200',
    'level-4': 'bg-pink-100 text-pink-600 border border-pink-200',
    'level-5': 'bg-pink-200 text-pink-700 border border-pink-300',
    primary: 'bg-neon-100 text-neon-700 border border-neon-200',
    success: 'bg-neon-100 text-neon-700 border border-neon-200',
    warning: 'bg-silver-100 text-silver-600 border border-silver-200',
    danger: 'bg-pink-100 text-pink-600 border border-pink-200',
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

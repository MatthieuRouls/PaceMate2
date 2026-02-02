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
    'level-1': 'bg-primary-100 text-primary-700 border border-primary-200',
    'level-2': 'bg-primary-100 text-primary-700 border border-primary-200',
    'level-3': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    'level-4': 'bg-primary-200 text-primary-800 border border-primary-300',
    'level-5': 'bg-red-100 text-red-700 border border-red-200',
    primary: 'bg-primary-100 text-primary-700 border border-primary-200',
    success: 'bg-primary-100 text-primary-700 border border-primary-200',
    warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    danger: 'bg-red-100 text-red-700 border border-red-200',
    info: 'bg-gray-100 text-gray-700 border border-gray-200',
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

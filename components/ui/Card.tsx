import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'glass' | 'solid' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  className?: string;
}

export default function Card({
  children,
  variant = 'glass',
  padding = 'lg',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    glass: 'bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/5',
    solid: 'bg-white border border-gray-200 shadow-lg shadow-black/5',
    outline: 'bg-transparent border-2 border-gray-200',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const hoverStyles = hover
    ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/10 cursor-pointer'
    : '';

  return (
    <div
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverStyles}
        rounded-2xl
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

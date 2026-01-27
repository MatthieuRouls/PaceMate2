import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  maxW?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export default function Container({ children, maxW = '7xl', className = '' }: ContainerProps) {
  return (
    <div className={`${maxWidthClasses[maxW]} mx-auto px-6 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}

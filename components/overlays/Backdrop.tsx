'use client';

import { useEffect } from 'react';

interface BackdropProps {
  isOpen: boolean;
  onClose: () => void;
  blur?: boolean;
  className?: string;
  zIndex?: number;
}

export default function Backdrop({
  isOpen,
  onClose,
  blur = true,
  className = '',
  zIndex = 40
}: BackdropProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-dark-900/60 transition-opacity duration-200 ${
        blur ? 'backdrop-blur-sm' : ''
      } ${className}`}
      style={{ zIndex }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface OverlayPortalProps {
  children: ReactNode;
  containerId?: string;
}

export default function OverlayPortal({
  children,
  containerId = 'overlay-root'
}: OverlayPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Ensure container exists
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    return () => {
      // Cleanup only if we created the container and it's empty
      const el = document.getElementById(containerId);
      if (el && el.childNodes.length === 0) {
        el.remove();
      }
    };
  }, [containerId]);

  if (!mounted) return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  return createPortal(children, container);
}

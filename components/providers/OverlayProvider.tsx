'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface OverlayState {
  sessionPanel: {
    isOpen: boolean;
    sessionId: string | null;
  };
  createWizard: {
    isOpen: boolean;
    isDirty: boolean;
  };
  shareModal: {
    isOpen: boolean;
    sessionId: string | null;
  };
  confirmDialog: {
    isOpen: boolean;
    type: 'leave' | 'delete' | null;
    sessionId: string | null;
    onConfirm: (() => void) | null;
  };
  chatSheet: {
    isOpen: boolean;
    sessionId: string | null;
  };
}

interface OverlayContextType {
  state: OverlayState;
  // Session panel
  openSessionPanel: (sessionId: string) => void;
  closeSessionPanel: () => void;
  // Create wizard
  openCreateWizard: () => void;
  closeCreateWizard: (force?: boolean) => void;
  setCreateWizardDirty: (dirty: boolean) => void;
  // Share modal
  openShareModal: (sessionId: string) => void;
  closeShareModal: () => void;
  // Confirm dialog
  openConfirmDialog: (type: 'leave' | 'delete', sessionId: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;
  // Chat sheet
  openChatSheet: (sessionId: string) => void;
  closeChatSheet: () => void;
  // Utilities
  isDesktop: boolean;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

const initialState: OverlayState = {
  sessionPanel: { isOpen: false, sessionId: null },
  createWizard: { isOpen: false, isDirty: false },
  shareModal: { isOpen: false, sessionId: null },
  confirmDialog: { isOpen: false, type: null, sessionId: null, onConfirm: null },
  chatSheet: { isOpen: false, sessionId: null }
};

export function OverlayProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<OverlayState>(initialState);
  const [isDesktop, setIsDesktop] = useState(true);
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  // Track window size for responsive behavior
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // Close any open overlays on back navigation
      setState(prev => ({
        ...prev,
        sessionPanel: { isOpen: false, sessionId: null },
        createWizard: { ...prev.createWizard, isOpen: false },
        chatSheet: { isOpen: false, sessionId: null }
      }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync URL with overlay state
  useEffect(() => {
    // Check if we're on a session details page
    const sessionMatch = pathname.match(/^\/sessions\/([^/]+)$/);
    if (sessionMatch && !state.sessionPanel.isOpen) {
      // Deep link scenario - show session panel
      const sessionId = sessionMatch[1];
      if (sessionId !== 'create') {
        setState(prev => ({
          ...prev,
          sessionPanel: { isOpen: true, sessionId }
        }));
      }
    }

    // Check if we're on create page
    if (pathname === '/sessions/create' && !state.createWizard.isOpen) {
      setState(prev => ({
        ...prev,
        createWizard: { isOpen: true, isDirty: false }
      }));
    }

    // Check for chat tab in URL
    const tab = searchParams.get('tab');
    if (tab === 'chat' && state.sessionPanel.sessionId && !state.chatSheet.isOpen) {
      setState(prev => ({
        ...prev,
        chatSheet: { isOpen: true, sessionId: prev.sessionPanel.sessionId }
      }));
    }
  }, [pathname, searchParams, state.sessionPanel.isOpen, state.createWizard.isOpen, state.chatSheet.isOpen, state.sessionPanel.sessionId]);

  // Session Panel
  const openSessionPanel = useCallback((sessionId: string) => {
    setPreviousPath(pathname);
    setState(prev => ({
      ...prev,
      sessionPanel: { isOpen: true, sessionId }
    }));
    // Update URL without full navigation
    window.history.pushState({}, '', `/sessions/${sessionId}`);
  }, [pathname]);

  const closeSessionPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      sessionPanel: { isOpen: false, sessionId: null },
      chatSheet: { isOpen: false, sessionId: null }
    }));
    // Navigate back or to dashboard
    if (previousPath && previousPath !== pathname) {
      router.push(previousPath);
    } else {
      router.push('/dashboard');
    }
    setPreviousPath(null);
  }, [router, previousPath, pathname]);

  // Create Wizard
  const openCreateWizard = useCallback(() => {
    setPreviousPath(pathname);
    setState(prev => ({
      ...prev,
      createWizard: { isOpen: true, isDirty: false }
    }));
    window.history.pushState({}, '', '/sessions/create');
  }, [pathname]);

  const closeCreateWizard = useCallback((force = false) => {
    if (state.createWizard.isDirty && !force) {
      // Show confirmation dialog if dirty
      setState(prev => ({
        ...prev,
        confirmDialog: {
          isOpen: true,
          type: 'leave',
          sessionId: null,
          onConfirm: () => {
            setState(p => ({
              ...p,
              createWizard: { isOpen: false, isDirty: false },
              confirmDialog: initialState.confirmDialog
            }));
            if (previousPath) {
              router.push(previousPath);
            } else {
              router.push('/dashboard');
            }
            setPreviousPath(null);
          }
        }
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      createWizard: { isOpen: false, isDirty: false }
    }));
    if (previousPath) {
      router.push(previousPath);
    } else {
      router.push('/dashboard');
    }
    setPreviousPath(null);
  }, [state.createWizard.isDirty, router, previousPath]);

  const setCreateWizardDirty = useCallback((dirty: boolean) => {
    setState(prev => ({
      ...prev,
      createWizard: { ...prev.createWizard, isDirty: dirty }
    }));
  }, []);

  // Share Modal
  const openShareModal = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      shareModal: { isOpen: true, sessionId }
    }));
  }, []);

  const closeShareModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      shareModal: { isOpen: false, sessionId: null }
    }));
  }, []);

  // Confirm Dialog
  const openConfirmDialog = useCallback((
    type: 'leave' | 'delete',
    sessionId: string,
    onConfirm: () => void
  ) => {
    setState(prev => ({
      ...prev,
      confirmDialog: { isOpen: true, type, sessionId, onConfirm }
    }));
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      confirmDialog: initialState.confirmDialog
    }));
  }, []);

  // Chat Sheet
  const openChatSheet = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      chatSheet: { isOpen: true, sessionId }
    }));
    // Update URL with tab parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'chat');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const closeChatSheet = useCallback(() => {
    setState(prev => ({
      ...prev,
      chatSheet: { isOpen: false, sessionId: null }
    }));
    // Remove tab parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <OverlayContext.Provider value={{
      state,
      openSessionPanel,
      closeSessionPanel,
      openCreateWizard,
      closeCreateWizard,
      setCreateWizardDirty,
      openShareModal,
      closeShareModal,
      openConfirmDialog,
      closeConfirmDialog,
      openChatSheet,
      closeChatSheet,
      isDesktop
    }}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
}

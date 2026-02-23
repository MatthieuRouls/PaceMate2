'use client';

import { useOverlay } from '@/components/providers/OverlayProvider';
import { SidePanel, FullscreenOverlay, BottomSheet, ConfirmDialog } from './index';
import SessionDetailsContent from '@/components/session/SessionDetailsContent';
import ShareModal from '@/components/session/ShareModal';
import CreateWizardOverlay from '@/components/session/CreateWizardOverlay';
import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { getSessionDetails } from '@/lib/actions';

export default function OverlayContainer() {
  const {
    state,
    closeSessionPanel,
    closeCreateWizard,
    closeShareModal,
    closeConfirmDialog,
    closeChatSheet,
    openShareModal,
    openConfirmDialog,
    openChatSheet,
    isDesktop
  } = useOverlay();

  const [sessionForShare, setSessionForShare] = useState<Session | null>(null);

  // Fetch session data for share modal
  useEffect(() => {
    if (state.shareModal.sessionId) {
      getSessionDetails(state.shareModal.sessionId).then(setSessionForShare);
    } else {
      setSessionForShare(null);
    }
  }, [state.shareModal.sessionId]);

  // Confirm dialog content based on type
  const getConfirmDialogProps = () => {
    switch (state.confirmDialog.type) {
      case 'leave':
        return {
          title: 'Quitter la session ?',
          message: 'Tu ne pourras plus participer a cette sortie. Les autres participants seront notifies.',
          confirmLabel: 'Quitter',
          icon: 'leave' as const
        };
      case 'delete':
        return {
          title: 'Supprimer la session ?',
          message: 'Cette action est irreversible. Tous les participants seront prevenus et desinscrits.',
          confirmLabel: 'Supprimer',
          icon: 'delete' as const
        };
      default:
        return {
          title: 'Confirmer',
          message: 'Etes-vous sur ?',
          confirmLabel: 'Confirmer',
          icon: 'warning' as const
        };
    }
  };

  const confirmProps = getConfirmDialogProps();

  return (
    <>
      {/* Session Details Panel - Desktop: SidePanel, Mobile: FullscreenOverlay */}
      {isDesktop ? (
        <SidePanel
          isOpen={state.sessionPanel.isOpen}
          onClose={closeSessionPanel}
          width="w-[480px]"
        >
          {state.sessionPanel.sessionId && (
            <SessionDetailsContent
              sessionId={state.sessionPanel.sessionId}
              onClose={closeSessionPanel}
              onShare={() => openShareModal(state.sessionPanel.sessionId!)}
              onLeaveConfirm={(onConfirm) => openConfirmDialog('leave', state.sessionPanel.sessionId!, onConfirm)}
              onDeleteConfirm={(onConfirm) => openConfirmDialog('delete', state.sessionPanel.sessionId!, onConfirm)}
              onOpenChat={() => openChatSheet(state.sessionPanel.sessionId!)}
            />
          )}
        </SidePanel>
      ) : (
        <FullscreenOverlay
          isOpen={state.sessionPanel.isOpen}
          onClose={closeSessionPanel}
          showBackButton
          showCloseButton={false}
        >
          {state.sessionPanel.sessionId && (
            <SessionDetailsContent
              sessionId={state.sessionPanel.sessionId}
              onClose={closeSessionPanel}
              onShare={() => openShareModal(state.sessionPanel.sessionId!)}
              onLeaveConfirm={(onConfirm) => openConfirmDialog('leave', state.sessionPanel.sessionId!, onConfirm)}
              onDeleteConfirm={(onConfirm) => openConfirmDialog('delete', state.sessionPanel.sessionId!, onConfirm)}
              onOpenChat={() => openChatSheet(state.sessionPanel.sessionId!)}
              compact
            />
          )}
        </FullscreenOverlay>
      )}

      {/* Share Modal */}
      {state.shareModal.sessionId && sessionForShare && (
        <ShareModal
          isOpen={state.shareModal.isOpen}
          onClose={closeShareModal}
          sessionId={state.shareModal.sessionId}
          sessionTitle={sessionForShare.title}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={state.confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={() => {
          state.confirmDialog.onConfirm?.();
          closeConfirmDialog();
        }}
        title={confirmProps.title}
        message={confirmProps.message}
        confirmLabel={confirmProps.confirmLabel}
        icon={confirmProps.icon}
        type="danger"
      />

      {/* Chat Bottom Sheet (mobile only) - when session panel is also open */}
      {!isDesktop && state.chatSheet.isOpen && (
        <BottomSheet
          isOpen={state.chatSheet.isOpen}
          onClose={closeChatSheet}
          title="Chat de la session"
          height="h-[85vh]"
        >
          <div className="p-4 text-center text-dark-500">
            {/* The existing chat system will be integrated here */}
            <p>Chat en cours de chargement...</p>
          </div>
        </BottomSheet>
      )}

      {/* Create Session Wizard */}
      <CreateWizardOverlay />
    </>
  );
}

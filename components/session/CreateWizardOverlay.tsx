'use client';

import dynamic from 'next/dynamic';
import { useOverlay } from '@/components/providers/OverlayProvider';
import { FullscreenOverlay, ConfirmDialog } from '@/components/overlays';
import { useState } from 'react';

// Dynamically import the create page content to avoid circular dependencies
const CreateSessionContent = dynamic(
  () => import('./CreateSessionContent'),
  { ssr: false }
);

export default function CreateWizardOverlay() {
  const { state, closeCreateWizard, setCreateWizardDirty } = useOverlay();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = () => {
    if (state.createWizard.isDirty) {
      setShowConfirm(true);
    } else {
      closeCreateWizard(true);
    }
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    closeCreateWizard(true);
  };

  return (
    <>
      <FullscreenOverlay
        isOpen={state.createWizard.isOpen}
        onClose={handleClose}
        showCloseButton
        showBackButton={false}
      >
        <CreateSessionContent
          onDirtyChange={setCreateWizardDirty}
          onSuccess={() => closeCreateWizard(true)}
        />
      </FullscreenOverlay>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmClose}
        title="Abandonner la creation ?"
        message="Ta sortie n'a pas ete enregistree. Les informations saisies seront perdues."
        confirmLabel="Abandonner"
        cancelLabel="Continuer"
        type="warning"
        icon="leave"
      />
    </>
  );
}

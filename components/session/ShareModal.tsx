'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Send } from 'lucide-react';
import { ModalDialog } from '@/components/overlays';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/sessions/${sessionId}`
    : `/sessions/${sessionId}`;

  const shareText = `Rejoins-moi pour "${sessionTitle}" sur PaceMate !`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleMessenger = () => {
    const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Partager la sortie"
      size="sm"
    >
      <div className="space-y-4">
        {/* Copy link */}
        <div>
          <label className="block text-sm font-medium text-dark-600 dark:text-silver-400 mb-2">
            Lien de la sortie
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2.5 rounded-xl bg-silver-100 dark:bg-dark-700 border border-silver-300 dark:border-dark-600 text-sm text-dark-700 dark:text-silver-300 truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                copied
                  ? 'bg-neon-700 text-white'
                  : 'bg-silver-200 dark:bg-dark-600 text-dark-700 dark:text-silver-300 hover:bg-silver-300 dark:hover:bg-dark-500'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copie
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier
                </>
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-silver-200 dark:bg-dark-600" />
          <span className="text-xs text-dark-400 font-medium">ou partager via</span>
          <div className="flex-1 h-px bg-silver-200 dark:bg-dark-600" />
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 py-3 rounded-xl bg-[#25D366] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </button>
          <button
            onClick={handleMessenger}
            className="flex-1 py-3 rounded-xl bg-[#0084FF] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#0073e6] transition-colors"
          >
            <Send className="w-5 h-5" />
            Messenger
          </button>
        </div>

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full py-3 rounded-xl bg-silver-100 dark:bg-dark-700 text-dark-700 dark:text-silver-300 font-semibold hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors"
          >
            Autres options de partage...
          </button>
        )}
      </div>
    </ModalDialog>
  );
}

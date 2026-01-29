'use client';

import { useState } from 'react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  sessionTitle: string;
}

export default function RatingModal({ isOpen, onClose, onSubmit, sessionTitle }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    await onSubmit(rating, comment);
    setSubmitting(false);
    handleClose();
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Comment s'est passée cette sortie ?</h2>
        <p className="text-sm opacity-75 mb-6">{sessionTitle}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stars */}
          <div>
            <label className="block font-semibold mb-3">Note <span className="text-red-500">*</span></label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-5xl transition-all hover:scale-110"
                  style={{
                    color: star <= (hoveredRating || rating) ? '#0066cc' : '#e9ecef',
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center mt-2 text-sm font-semibold" style={{ color: '#0066cc' }}>
                {rating} / 5 étoiles
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block font-semibold mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Qu'avez-vous pensé de cette sortie ?"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
              style={{
                borderColor: '#dee2e6',
              }}
            />
            <p className="text-sm opacity-75 mt-1">{comment.length}/300 caractères</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={rating === 0 || submitting}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '⏳ Envoi...' : 'Envoyer ma note'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-secondary"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

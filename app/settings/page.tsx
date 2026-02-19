'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { updateProfile, deleteAccount } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import {
  User,
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  Check,
  X,
  LogOut,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading: authLoading, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Initialize form with profile data
  if (profile && !initialized) {
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatar_url || null);
    setInitialized(true);
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit etre une image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas depasser 2 Mo');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Erreur lors de l\'upload de l\'image');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const result = await updateProfile({ avatar_url: newAvatarUrl });

      if (result.success) {
        setAvatarUrl(newAvatarUrl);
        setSuccess('Photo de profil mise a jour');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Erreur lors de la mise a jour');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Erreur lors de l\'upload');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
      });

      if (result.success) {
        setSuccess('Profil mis a jour avec succes');
        setTimeout(() => setSuccess(null), 3000);
        // Reload to refresh profile in context
        window.location.reload();
      } else {
        setError(result.error || 'Erreur lors de la mise a jour');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erreur inattendue');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      setError('Tape SUPPRIMER pour confirmer');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteAccount();

      if (result.success) {
        // Sign out and redirect
        await signOut();
        router.push('/');
      } else {
        setError(result.error || 'Erreur lors de la suppression');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erreur inattendue');
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-dark-500">Profil non trouve</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-800 mb-2">Parametres</h1>
          <p className="text-dark-500">Gere ton compte et tes preferences</p>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-neon-50 border border-neon-200 flex items-center gap-3">
            <Check className="w-5 h-5 text-neon-700" />
            <span className="text-neon-700 font-medium">{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-pink-50 border border-pink-200 flex items-center gap-3">
            <X className="w-5 h-5 text-pink-600" />
            <span className="text-pink-600 font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Photo de profil */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-neon-700" />
              Photo de profil
            </h2>

            <div className="flex items-center gap-6">
              {/* Avatar preview */}
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(username || profile.username)}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm text-dark-500 mb-3">
                  JPG, PNG ou GIF. 2 Mo maximum.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-700 text-neon-700 text-sm font-medium hover:bg-neon-50 transition-colors disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  {uploadingPhoto ? 'Upload...' : 'Changer la photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Informations du profil */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-neon-700" />
              Informations du profil
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ton nom"
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all"
                />
                <p className="text-xs text-dark-500 mt-1">{username.length}/30 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Parle-nous de toi..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all resize-none"
                />
                <p className="text-xs text-dark-500 mt-1">{bio.length}/200 caracteres</p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-neon-700 text-white font-semibold hover:bg-neon-600 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Compte */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-dark-500" />
              Compte
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-silver-100 rounded-lg">
                <p className="text-sm text-dark-600">
                  <span className="font-medium">Email : </span>
                  {profile.email || 'Non renseigne'}
                </p>
              </div>

              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-300 text-dark-700 text-sm font-medium hover:bg-silver-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se deconnecter
              </button>
            </div>
          </div>

          {/* Zone de danger */}
          <div className="card p-6 border-2 border-pink-200">
            <h2 className="text-lg font-bold text-pink-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Zone de danger
            </h2>

            {!showDeleteConfirm ? (
              <div>
                <p className="text-sm text-dark-600 mb-4">
                  La suppression de ton compte est irreversible. Toutes tes donnees seront supprimees.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer mon compte
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-pink-700 font-medium mb-2">
                    Es-tu sur de vouloir supprimer ton compte ?
                  </p>
                  <p className="text-sm text-pink-600">
                    Cette action est irreversible. Tape <strong>SUPPRIMER</strong> pour confirmer.
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Tape SUPPRIMER"
                  className="w-full px-4 py-3 rounded-lg border border-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg border border-dark-300 text-dark-700 text-sm font-medium hover:bg-silver-100 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

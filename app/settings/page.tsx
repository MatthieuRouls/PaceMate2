'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  updateProfile,
  deleteAccount,
  getStravaConnectUrl,
  syncStravaData,
  disconnectStrava,
} from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { LEVEL_THRESHOLDS } from '@/lib/constants';
import {
  User,
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  Check,
  X,
  LogOut,
  Link2,
  Venus,
  Mars,
  Sparkles,
  RefreshCw,
  Unlink,
  TrendingUp,
  Route,
  Calendar,
  Timer,
  Phone,
  Shield,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

const RELATION_OPTIONS = [
  { value: 'family', label: 'Famille' },
  { value: 'friend', label: 'Ami(e)' },
  { value: 'partner', label: 'Conjoint(e)' },
  { value: 'other', label: 'Autre' },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [phoneProviderDisabled, setPhoneProviderDisabled] = useState(false);

  // Safety mode state
  const [safetyMode, setSafetyMode] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);

  // Trusted contact state
  const [tcName, setTcName] = useState('');
  const [tcPhone, setTcPhone] = useState('');
  const [tcRelation, setTcRelation] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Strava state
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [syncingStrava, setSyncingStrava] = useState(false);
  const [disconnectingStrava, setDisconnectingStrava] = useState(false);

  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  useEffect(() => {
    const stravaSuccess = searchParams.get('strava_success');
    const stravaError = searchParams.get('strava_error');
    if (stravaSuccess === 'true') {
      setSuccess('Compte Strava connecté avec succès ! Ton niveau a été calculé.');
      router.replace('/settings');
    } else if (stravaError) {
      const msgs: Record<string, string> = {
        access_denied: 'Accès refusé. Tu as annulé la connexion.',
        no_code: 'Erreur de connexion Strava.',
        not_authenticated: 'Tu dois être connecté.',
        update_failed: 'Erreur lors de la mise à jour du profil.',
        exchange_failed: 'Erreur de communication avec Strava.',
      };
      setError(msgs[stravaError] || 'Erreur Strava inconnue.');
      router.replace('/settings');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setGender(profile.gender || '');
      setAvatarUrl(profile.avatar_url || null);
      setPhoneNumber(profile.phone_number || '');
      setPhoneVerified(profile.phone_verified || false);
      setSafetyMode(profile.safety_enhanced_mode || false);
      setTcName(profile.trusted_contact_name || '');
      setTcPhone(profile.trusted_contact_phone || '');
      setTcRelation(profile.trusted_contact_relation || '');
    }
  }, [profile]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getLevelName = (level: number) =>
    LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS]?.name || 'Inconnu';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) { setError('Le fichier doit être une image'); return; }
    if (file.size > 2 * 1024 * 1024) { setError("L'image ne doit pas dépasser 2 Mo"); return; }
    setUploadingPhoto(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) { setError("Erreur lors de l'upload"); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const result = await updateProfile({ avatar_url: urlData.publicUrl });
      if (result.success) { setAvatarUrl(urlData.publicUrl); showSuccess('Photo mise à jour'); }
      else setError(result.error || 'Erreur');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    const result = await updateProfile({ username: username.trim(), bio: bio.trim(), ...(gender ? { gender } : {}) });
    setSaving(false);
    if (result.success) { showSuccess('Profil mis à jour'); await refreshProfile(); }
    else setError(result.error || 'Erreur');
  };

  const handleSendOtp = async () => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    if (!cleaned || cleaned.length < 10) { setError('Numéro invalide'); return; }
    setSendingOtp(true);
    setError(null);
    setPhoneProviderDisabled(false);
    const { error: otpError } = await supabase.auth.updateUser({ phone: cleaned });
    setSendingOtp(false);
    if (otpError) {
      if (otpError.message.toLowerCase().includes('not enabled') || otpError.message.toLowerCase().includes('provider')) {
        setPhoneProviderDisabled(true);
      } else {
        setError(otpError.message);
      }
      return;
    }
    setOtpSent(true);
    setOtpCode('');
    setPhoneCountdown(60);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { setError('Code à 6 chiffres requis'); return; }
    setVerifyingOtp(true);
    setError(null);
    const cleaned = phoneNumber.replace(/\s/g, '');
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: cleaned, token: otpCode, type: 'phone_change' });
    setVerifyingOtp(false);
    if (verifyError) { setError('Code incorrect ou expiré'); return; }
    await updateProfile({ phone_number: cleaned, phone_verified: true });
    setPhoneVerified(true);
    setOtpSent(false);
    showSuccess('Numéro de téléphone vérifié !');
    await refreshProfile();
  };

  const handleToggleSafetyMode = async (val: boolean) => {
    setSavingSafety(true);
    const result = await updateProfile({ safety_enhanced_mode: val });
    setSavingSafety(false);
    if (result.success) { setSafetyMode(val); showSuccess(val ? 'Mode sécurité activé' : 'Mode sécurité désactivé'); }
    else setError(result.error || 'Erreur');
  };

  const handleSaveTrustedContact = async () => {
    if (tcName && !tcPhone) { setError('Téléphone requis si nom fourni'); return; }
    setSavingContact(true);
    setError(null);
    const result = await updateProfile({
      trusted_contact_name: tcName,
      trusted_contact_phone: tcPhone,
      trusted_contact_relation: tcRelation,
    });
    setSavingContact(false);
    if (result.success) showSuccess('Contact de confiance enregistré');
    else setError(result.error || 'Erreur');
  };

  const handleConnectStrava = async () => {
    setConnectingStrava(true);
    const result = await getStravaConnectUrl();
    if ('url' in result) window.location.href = result.url;
    else { setError(result.error); setConnectingStrava(false); }
  };

  const handleSyncStrava = async () => {
    setSyncingStrava(true);
    const result = await syncStravaData();
    if (result.success) { showSuccess(`Synchronisé ! Niveau : ${getLevelName(result.level || 1)}`); setTimeout(() => refreshProfile(), 2000); }
    else setError(result.error || 'Erreur');
    setSyncingStrava(false);
  };

  const handleDisconnectStrava = async () => {
    setDisconnectingStrava(true);
    const result = await disconnectStrava();
    if (result.success) { showSuccess('Strava déconnecté'); setTimeout(() => refreshProfile(), 2000); }
    else setError(result.error || 'Erreur');
    setDisconnectingStrava(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') { setError('Tape SUPPRIMER pour confirmer'); return; }
    setDeleting(true);
    const result = await deleteAccount();
    if (result.success) { await signOut(); router.push('/'); }
    else { setError(result.error || 'Erreur'); setDeleting(false); }
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
          <p className="text-dark-500">Profil non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-800 mb-2">Paramètres</h1>
          <p className="text-dark-500">Gère ton compte et tes préférences</p>
        </div>

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
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover" />
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
                <p className="text-sm text-dark-500 mb-3">JPG, PNG ou GIF. 2 Mo maximum.</p>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
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
                <label className="block text-sm font-medium text-dark-800 mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all"
                />
                <p className="text-xs text-dark-500 mt-1">{username.length}/30 caractères</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all resize-none"
                />
                <p className="text-xs text-dark-500 mt-1">{bio.length}/200 caractères</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-dark-800">Genre</label>
                  {profile?.gender && (
                    <span className="text-xs text-dark-400">Non modifiable</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'male',   label: 'Homme', Icon: Mars },
                    { value: 'female', label: 'Femme', Icon: Venus },
                    { value: 'other',  label: 'Autre', Icon: Sparkles },
                  ] as const).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { if (!profile?.gender) setGender(value); }}
                      disabled={!!profile?.gender}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                        gender === value
                          ? 'border-neon-700 bg-neon-50 text-neon-700'
                          : 'border-silver-300 text-dark-400'
                      } ${profile?.gender ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-neon-700 hover:bg-neon-50/30'}`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
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

          {/* Téléphone */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-neon-700" />
              Numéro de téléphone
              {phoneVerified && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-100 text-neon-700 text-xs font-semibold">
                  <Check className="w-3 h-3" /> Vérifié
                </span>
              )}
            </h2>

            {phoneProviderDisabled && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-semibold">Provider SMS non configuré</p>
                <p className="text-xs mt-1">Active le provider Phone dans Supabase Dashboard → Auth → Providers → Phone et configure Twilio.</p>
              </div>
            )}

            {!otpSent ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all"
                />
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-dark-800 text-neon-500 text-sm font-semibold hover:bg-dark-700 transition-colors disabled:opacity-50"
                >
                  {sendingOtp ? <LoadingSpinner size="sm" /> : <Phone className="w-4 h-4" />}
                  {sendingOtp ? 'Envoi...' : phoneVerified ? 'Changer le numéro' : 'Envoyer le code SMS'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-dark-600">Code envoyé au <strong>{phoneNumber}</strong></p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Code à 6 chiffres"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-center text-2xl font-bold tracking-widest"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6 || verifyingOtp}
                    className="flex-1 py-2.5 rounded-lg bg-dark-800 text-neon-500 text-sm font-semibold disabled:opacity-50"
                  >
                    {verifyingOtp ? 'Vérification...' : 'Vérifier'}
                  </button>
                  <button
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="px-4 py-2.5 rounded-lg border border-silver-400 text-dark-700 text-sm"
                  >
                    Annuler
                  </button>
                </div>
                {phoneCountdown > 0 ? (
                  <p className="text-xs text-dark-400">Renvoyer dans {phoneCountdown}s</p>
                ) : (
                  <button onClick={handleSendOtp} className="text-xs text-neon-700 hover:underline">Renvoyer le code</button>
                )}
              </div>
            )}
          </div>

          {/* Mode sécurité renforcée */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-neon-700" />
              Mode sécurité renforcée
            </h2>
            <p className="text-sm text-dark-500 mb-4">
              Partage ta position en temps réel avec ton contact de confiance pendant tes sorties.
            </p>
            <label className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => !savingSafety && handleToggleSafetyMode(!safetyMode)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${safetyMode ? 'bg-neon-700' : 'bg-silver-300'} ${savingSafety ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${safetyMode ? 'translate-x-6' : ''}`} />
              </button>
              <span className="text-sm font-medium text-dark-800">
                {safetyMode ? 'Activé' : 'Désactivé'}
              </span>
            </label>
          </div>

          {/* Contact de confiance */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-neon-700" />
              Contact de confiance
            </h2>
            <p className="text-sm text-dark-500 mb-4">
              Personne à prévenir en cas d'urgence. Jamais partagé sans ton accord.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-dark-600 mb-1">Nom</label>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={tcName}
                  onChange={(e) => setTcName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-600 mb-1">Téléphone</label>
                <input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={tcPhone}
                  onChange={(e) => setTcPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-silver-400 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-600 mb-1">Relation</label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTcRelation(opt.value)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tcRelation === opt.value ? 'border-neon-700 bg-neon-50 text-neon-700' : 'border-silver-300 text-dark-600 hover:border-silver-400'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveTrustedContact}
                disabled={savingContact}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neon-700 text-white text-sm font-semibold hover:bg-neon-600 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingContact ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Vérification d'identité */}
          <div className="card p-6 border-2 border-purple-200">
            <h2 className="text-lg font-bold text-dark-800 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Vérification d'identité
            </h2>
            <p className="text-sm text-dark-500 mb-4">
              Vérifie ton identité avec une pièce d'identité + selfie pour accéder à toutes les fonctionnalités
              de sécurité (niveau 2).
            </p>
            <a
              href="/settings/identity"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Vérifier mon identité
            </a>
          </div>

          {/* Connexion Strava */}
          <div className="card p-6 border-2 border-orange-200">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Connexion Strava
            </h2>
            {profile.strava_connected ? (
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-orange-700">Compte Strava connecté</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 text-dark-500 text-xs mb-1"><TrendingUp className="w-3 h-3" />Niveau calculé</div>
                      <div className="font-bold text-dark-800">{getLevelName(profile.running_level)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 text-dark-500 text-xs mb-1"><Timer className="w-3 h-3" />Allure moyenne</div>
                      <div className="font-bold text-dark-800">{profile.calculated_avg_pace || '--'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 text-dark-500 text-xs mb-1"><Route className="w-3 h-3" />Km/semaine</div>
                      <div className="font-bold text-dark-800">{profile.calculated_weekly_km?.toFixed(1) || '0'} km</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 text-dark-500 text-xs mb-1"><Calendar className="w-3 h-3" />Courses (3 mois)</div>
                      <div className="font-bold text-dark-800">{profile.calculated_total_runs || 0}</div>
                    </div>
                  </div>
                  {profile.strava_last_sync && (
                    <p className="text-xs text-dark-500 mt-3">
                      Dernière sync : {new Date(profile.strava_last_sync).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSyncStrava} disabled={syncingStrava} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${syncingStrava ? 'animate-spin' : ''}`} />
                    {syncingStrava ? 'Synchronisation...' : 'Synchroniser'}
                  </button>
                  <button onClick={handleDisconnectStrava} disabled={disconnectingStrava} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-300 text-dark-700 text-sm font-medium hover:bg-silver-100 transition-colors disabled:opacity-50">
                    <Unlink className="w-4 h-4" />
                    {disconnectingStrava ? 'Déconnexion...' : 'Déconnecter'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-dark-600 mb-4">
                  Connecte ton compte Strava pour calculer automatiquement ton niveau de course.
                </p>
                <button onClick={handleConnectStrava} disabled={connectingStrava} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
                  <Link2 className="w-4 h-4" />
                  {connectingStrava ? 'Connexion...' : 'Connecter Strava'}
                </button>
              </div>
            )}
          </div>

          {/* Compte */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-dark-500" />
              Compte
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-silver-100 rounded-lg">
                <p className="text-sm text-dark-600"><span className="font-medium">Email : </span>{profile.email || 'Non renseigné'}</p>
              </div>
              <button onClick={() => signOut()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-300 text-dark-700 text-sm font-medium hover:bg-silver-100 transition-colors">
                <LogOut className="w-4 h-4" />
                Se déconnecter
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
                <p className="text-sm text-dark-600 mb-4">La suppression de ton compte est irréversible. Toutes tes données seront supprimées.</p>
                <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors">
                  <Trash2 className="w-4 h-4" />Supprimer mon compte
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-pink-700 font-medium mb-1">Es-tu sûr de vouloir supprimer ton compte ?</p>
                  <p className="text-sm text-pink-600">Tape <strong>SUPPRIMER</strong> pour confirmer.</p>
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Tape SUPPRIMER"
                  className="w-full px-4 py-3 rounded-lg border border-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none"
                />
                <div className="flex gap-3">
                  <button onClick={handleDeleteAccount} disabled={deleting || deleteConfirmText !== 'SUPPRIMER'} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />{deleting ? 'Suppression...' : 'Confirmer la suppression'}
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="px-4 py-2 rounded-lg border border-dark-300 text-dark-700 text-sm">Annuler</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

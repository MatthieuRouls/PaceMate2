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

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); ob.unobserve(el); } },
      { threshold }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

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

  // Scroll entrance refs
  const [headerRef, headerVisible] = useInView(0.2);
  const [sec1Ref, sec1Visible] = useInView(0.1);
  const [sec2Ref, sec2Visible] = useInView(0.1);
  const [sec3Ref, sec3Visible] = useInView(0.1);
  const [sec4Ref, sec4Visible] = useInView(0.1);
  const [sec5Ref, sec5Visible] = useInView(0.1);

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
      // Nettoyer l'URL sans déclencher de refetch RSC côté Next.js
      window.history.replaceState({}, '', '/settings');
      refreshProfile();
      setSuccess('Compte Strava connecté ! Clique "Synchroniser" pour calculer ton niveau.');
    } else if (stravaError) {
      const msgs: Record<string, string> = {
        access_denied: 'Accès refusé. Tu as annulé la connexion.',
        no_code: 'Erreur de connexion Strava.',
        not_authenticated: 'Tu dois être connecté.',
        update_failed: 'Erreur lors de la mise à jour du profil.',
        exchange_failed: 'Erreur de communication avec Strava.',
      };
      setError(msgs[stravaError] || 'Erreur Strava inconnue.');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, router, refreshProfile]);

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
    try {
      const result = await getStravaConnectUrl();
      if ('url' in result) {
        window.location.href = result.url;
      } else {
        setError(result.error);
        setConnectingStrava(false);
      }
    } catch (err) {
      setError('Erreur inattendue lors de la connexion Strava');
      setConnectingStrava(false);
    }
  };

  const handleSyncStrava = async () => {
    setSyncingStrava(true);
    try {
      const result = await syncStravaData();
      if (result.success) {
        showSuccess(`Synchronisé ! Niveau : ${getLevelName(result.level || 1)}`);
        await refreshProfile();
      } else {
        setError(result.error || 'Erreur lors de la synchronisation');
      }
    } catch {
      setError('Erreur inattendue lors de la synchronisation');
    } finally {
      setSyncingStrava(false);
    }
  };

  const handleDisconnectStrava = async () => {
    setDisconnectingStrava(true);
    try {
      const result = await disconnectStrava();
      if (result.success) {
        showSuccess('Strava déconnecté');
        await refreshProfile();
      } else {
        setError(result.error || 'Erreur lors de la déconnexion');
      }
    } catch {
      setError('Erreur inattendue lors de la déconnexion');
    } finally {
      setDisconnectingStrava(false);
    }
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
      <div className="settings-bg min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="settings-bg min-h-screen pt-28 px-4">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-dark-500">Profil non trouvé</p>
        </div>
      </div>
    );
  }

  const genderLabels: Record<string, string> = { male: 'Homme', female: 'Femme', other: 'Autre' };

  return (
    <div className="settings-bg settings-noise min-h-screen pt-24 pb-24 px-4 sm:px-6">
      <div className="relative z-10 max-w-[720px] mx-auto">

        {/* ── Toast notifications ── */}
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
          {success && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-dark-800 text-white text-sm font-medium shadow-xl animate-in slide-in-from-top-2 duration-200 signal-glow-sm">
              <Check className="w-4 h-4 text-[#16C784] shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-pink-600 text-white text-sm font-medium shadow-xl animate-in slide-in-from-top-2 duration-200">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* ── PROFILE HEADER ── */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`flex items-center gap-5 mb-14 ${headerVisible ? 'pm-enter-up' : 'pm-hidden'}`}
        >
          <div className="relative shrink-0 avatar-lift">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className={`w-20 h-20 rounded-full object-cover ${phoneVerified ? 'verified-ring' : 'shadow-md ring-2 ring-white'}`}
              />
            ) : (
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white text-xl font-bold ${phoneVerified ? 'verified-ring' : 'shadow-md ring-2 ring-white'}`}
              >
                {getInitials(username || profile.username)}
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-silver-200 shadow-md flex items-center justify-center hover:bg-silver-50 transition-colors btn-lift"
            >
              <Camera className="w-3.5 h-3.5 text-dark-600" />
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-dark-800 truncate">
              {username || profile.username}
            </h1>
            <div className="flex items-center flex-wrap gap-2 mt-1.5">
              <span className="text-sm text-dark-400">
                Niv. {profile.running_level} · {getLevelName(profile.running_level)}
              </span>
              {phoneVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16C784]/10 text-[#0EA371] border border-[#16C784]/25 text-xs font-semibold">
                  <Check className="w-3 h-3" /> Vérifié
                </span>
              )}
              {profile.gender && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-silver-100 text-dark-500 border border-silver-200 text-xs font-medium">
                  {genderLabels[profile.gender]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-14">

          {/* ══════════════════════════════════════
              SECTION 1 — MON PROFIL  (fade + slide up)
          ══════════════════════════════════════ */}
          <section ref={sec1Ref as React.RefObject<HTMLElement>} className={sec1Visible ? 'pm-enter-up' : 'pm-hidden'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400/70 mb-4">Mon profil</p>
            <div className="settings-glass p-6 space-y-5">

              <div>
                <label className="block text-xs font-medium text-dark-500 mb-1.5">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-silver-200 bg-white/80 focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/10 outline-none transition-all text-dark-800 text-sm"
                />
                <p className="text-[11px] text-dark-400 mt-1">{username.length}/30</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-500 mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  placeholder="Parle de toi en quelques mots..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-silver-200 bg-white/80 focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/10 outline-none transition-all text-dark-800 text-sm resize-none"
                />
                <p className="text-[11px] text-dark-400 mt-1">{bio.length}/200</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-dark-500">Genre</label>
                  {profile.gender && <span className="text-[11px] text-dark-400">Non modifiable</span>}
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
                      onClick={() => { if (!profile.gender) setGender(value); }}
                      disabled={!!profile.gender}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-medium btn-lift ${
                        gender === value
                          ? 'border-[#16C784] bg-[#16C784]/8 text-[#0EA371]'
                          : 'border-silver-200 text-dark-400'
                      } ${profile.gender ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-silver-300 hover:text-dark-600'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16C784] text-white text-sm font-semibold hover:bg-[#0EA371] transition-colors disabled:opacity-50 btn-lift signal-glow-sm"
              >
                {saving ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 2 — SÉCURITÉ  (fade + scale)
          ══════════════════════════════════════ */}
          <section ref={sec2Ref as React.RefObject<HTMLElement>} className={sec2Visible ? 'pm-enter-scale' : 'pm-hidden'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400/70 mb-4">Sécurité</p>
            <div className={`safety-glass divide-y divide-[#16C784]/10 overflow-hidden ${safetyMode ? 'safety-pulse' : ''}`}>

              {/* Safety mode toggle */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${safetyMode ? 'bg-[#16C784]/15' : 'bg-silver-200'}`}>
                    <Shield className={`w-4 h-4 ${safetyMode ? 'text-[#16C784]' : 'text-dark-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-dark-800">Mode sécurité renforcée</p>
                    <p className="text-xs text-dark-400 mt-0.5">Position partagée en temps réel pendant tes sorties</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className={`text-xs font-semibold ${safetyMode ? 'text-[#16C784]' : 'text-dark-400'}`}>
                    {safetyMode ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => !savingSafety && handleToggleSafetyMode(!safetyMode)}
                    className={`relative rounded-full transition-all duration-300 ${
                      safetyMode
                        ? 'bg-[#16C784] toggle-active-glow'
                        : 'bg-silver-300'
                    } ${savingSafety ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ height: '22px', width: '40px', transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${safetyMode ? 'translate-x-[18px]' : ''}`}
                      style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
                    />
                  </button>
                </div>
              </div>

              {/* Trusted contact */}
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-dark-800">Contact de confiance</p>
                    <p className="text-xs text-dark-400 mt-0.5">Personne à prévenir en cas d'urgence · jamais partagée sans ton accord</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
                  <input
                    type="text"
                    placeholder="Nom du contact"
                    value={tcName}
                    onChange={(e) => setTcName(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-[#16C784]/20 bg-white/80 focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]/10 outline-none text-sm text-dark-800 transition-all"
                  />
                  <input
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={tcPhone}
                    onChange={(e) => setTcPhone(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-[#16C784]/20 bg-white/80 focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]/10 outline-none text-sm text-dark-800 transition-all"
                  />
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    {RELATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTcRelation(opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all btn-lift ${
                          tcRelation === opt.value
                            ? 'border-[#16C784] bg-[#16C784]/10 text-[#0EA371]'
                            : 'border-slate-200 bg-white/60 text-dark-500 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveTrustedContact}
                    disabled={savingContact}
                    className="sm:col-span-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16C784] text-white text-xs font-semibold hover:bg-[#0EA371] transition-colors disabled:opacity-50 w-fit btn-lift"
                  >
                    {savingContact ? <LoadingSpinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
                    {savingContact ? 'Enregistrement...' : 'Enregistrer le contact'}
                  </button>
                </div>
              </div>

              {/* Identity verification */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-dark-800">Vérification d'identité</p>
                    <p className="text-xs text-dark-400 mt-0.5">Pièce d'identité + selfie · débloque le niveau 2</p>
                  </div>
                </div>
                <a
                  href="/settings/identity"
                  className="ml-4 shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors btn-lift"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Vérifier
                </a>
              </div>

              {/* Phone number */}
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${phoneVerified ? 'bg-[#16C784]/15' : 'bg-silver-200'}`}>
                    <Phone className={`w-4 h-4 ${phoneVerified ? 'text-[#16C784]' : 'text-dark-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-dark-800">
                      Téléphone
                      {phoneVerified && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-[#16C784]">
                          <Check className="w-3 h-3" /> Vérifié
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-dark-400 mt-0.5">Requis pour les fonctionnalités de sécurité</p>
                  </div>
                </div>

                {phoneProviderDisabled && (
                  <div className="ml-11 mb-3 px-3 py-2.5 rounded-xl bg-dark-800 border border-white/10">
                    <p className="text-xs font-semibold text-silver-300">Vérification SMS temporairement indisponible</p>
                    <p className="text-xs text-dark-300 mt-0.5">Réessaie dans quelques instants ou contacte le support si le problème persiste.</p>
                  </div>
                )}

                {!otpSent ? (
                  <div className="flex gap-2 ml-11">
                    <input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#16C784]/20 bg-white/80 focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]/10 outline-none text-sm text-dark-800 transition-all"
                    />
                    <button
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-800 text-[#16C784] text-xs font-semibold hover:bg-dark-700 transition-colors disabled:opacity-50 shrink-0 btn-lift"
                    >
                      {sendingOtp ? <LoadingSpinner size="sm" /> : <Phone className="w-3.5 h-3.5" />}
                      {sendingOtp ? 'Envoi...' : phoneVerified ? 'Changer' : 'Envoyer'}
                    </button>
                  </div>
                ) : (
                  <div className="ml-11 space-y-3">
                    <p className="text-xs text-dark-500">Code envoyé au <strong className="text-dark-700">{phoneNumber}</strong></p>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#16C784]/20 bg-white/80 focus:border-[#16C784] outline-none text-center text-2xl font-bold tracking-[0.5em] transition-all"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpCode.length !== 6 || verifyingOtp}
                        className="flex-1 py-2 rounded-xl bg-[#16C784] text-white text-xs font-semibold disabled:opacity-50 btn-lift hover:bg-[#0EA371] transition-colors"
                      >
                        {verifyingOtp ? 'Vérification...' : 'Vérifier le code'}
                      </button>
                      <button
                        onClick={() => { setOtpSent(false); setOtpCode(''); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-dark-600 text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                    {phoneCountdown > 0 ? (
                      <p className="text-[11px] text-dark-400">Renvoyer dans {phoneCountdown}s</p>
                    ) : (
                      <button onClick={handleSendOtp} className="text-[11px] text-[#16C784] hover:underline">Renvoyer le code</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 3 — COMPTE & CONNEXIONS  (slide from left)
          ══════════════════════════════════════ */}
          <section ref={sec3Ref as React.RefObject<HTMLElement>} className={sec3Visible ? 'pm-enter-left' : 'pm-hidden'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400/70 mb-4">Compte & Connexions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Left: Account */}
              <div className="settings-glass p-5 flex flex-col gap-4">
                <div>
                  <p className="text-[11px] font-medium text-dark-400 uppercase tracking-wider mb-1.5">Email</p>
                  <p className="text-sm font-medium text-dark-700 truncate">{profile.email || '—'}</p>
                </div>
                <div className="h-px bg-silver-100" />
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-800 transition-colors font-medium btn-lift w-fit"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>

              {/* Right: Strava */}
              <div className={`settings-glass p-5 ${profile.strava_connected ? 'border-orange-200/50' : ''}`}
                style={profile.strava_connected ? { background: 'rgba(255,247,237,0.75)' } : undefined}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  <span className="text-sm font-semibold tracking-tight text-dark-800">Strava</span>
                  {profile.strava_connected && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                      <Check className="w-3 h-3" /> Connecté
                    </span>
                  )}
                </div>

                {profile.strava_connected ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: TrendingUp, label: 'Niveau', value: getLevelName(profile.running_level) },
                        { icon: Timer,      label: 'Allure',  value: profile.calculated_avg_pace || '—' },
                        { icon: Route,      label: 'Km/sem',  value: `${profile.calculated_weekly_km?.toFixed(0) || '0'} km` },
                        { icon: Calendar,   label: 'Courses', value: String(profile.calculated_total_runs || 0) },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-white/70 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-dark-400 font-medium flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                          <p className="text-sm font-bold text-dark-800 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                    {profile.strava_last_sync && (
                      <p className="text-[11px] text-dark-400">
                        Sync : {new Date(profile.strava_last_sync).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {!profile.calculated_avg_pace && (
                      <p className="text-xs text-orange-700 font-medium bg-orange-100 rounded-lg px-3 py-2">
                        ⚡ Clique "Synchroniser" pour calculer ton niveau depuis Strava
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSyncStrava}
                        disabled={syncingStrava}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-colors disabled:opacity-50 btn-lift ${
                          !profile.calculated_avg_pace
                            ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400 ring-offset-1'
                            : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingStrava ? 'animate-spin' : ''}`} />
                        {syncingStrava ? 'Calcul en cours...' : 'Synchroniser'}
                      </button>
                      <button
                        onClick={handleDisconnectStrava}
                        disabled={disconnectingStrava}
                        className="px-3 py-2 rounded-xl border border-orange-200 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors disabled:opacity-50 btn-lift"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-dark-500 mb-3">Connecte Strava pour calculer ton niveau automatiquement.</p>
                    <button
                      onClick={handleConnectStrava}
                      disabled={connectingStrava}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 btn-lift"
                    >
                      <Link2 className="w-4 h-4" />
                      {connectingStrava ? 'Connexion...' : 'Connecter Strava'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 4 — PRÉFÉRENCES  (fade only)
          ══════════════════════════════════════ */}
          <section ref={sec4Ref as React.RefObject<HTMLElement>} className={sec4Visible ? 'pm-enter-fade' : 'pm-hidden'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400/70 mb-4">Préférences de course</p>
            <div className="settings-glass p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-dark-400 mb-1.5">Allure habituelle</p>
                  <p className="text-xl font-bold tracking-tight text-dark-800">
                    {profile.calculated_avg_pace || '—'}
                    {profile.calculated_avg_pace && <span className="text-sm font-normal text-dark-400 ml-1">/km</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-dark-400 mb-1.5">Plus longue sortie</p>
                  <p className="text-xl font-bold tracking-tight text-dark-800">
                    {profile.calculated_longest_run ? `${profile.calculated_longest_run} km` : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-dark-400 mb-2.5">Types de sorties</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Détente',       key: 'casual' },
                    { label: 'Tempo',         key: 'tempo' },
                    { label: 'Fractionné',    key: 'intervals' },
                    { label: 'Sortie longue', key: 'long_run' },
                    { label: 'Récupération',  key: 'recovery' },
                  ].map(({ label }) => (
                    <span key={label} className="px-3 py-1.5 rounded-lg bg-white/60 border border-silver-200 text-xs font-medium text-dark-500">
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-dark-300 mt-2">Basé sur vos données Strava · personnalisation bientôt disponible</p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 5 — ZONE DE DANGER  (fade only)
          ══════════════════════════════════════ */}
          <section ref={sec5Ref as React.RefObject<HTMLElement>} className={sec5Visible ? 'pm-enter-fade' : 'pm-hidden'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-4">Zone de danger</p>
            <div className="danger-glass p-5">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-red-800">Supprimer mon compte</p>
                    <p className="text-xs text-red-500 mt-0.5">Action irréversible · toutes tes données seront effacées</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors btn-lift"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Confirme la suppression</p>
                    <p className="text-xs text-red-500">Tape <strong>SUPPRIMER</strong> pour continuer</p>
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 bg-white/80 focus:border-red-400 outline-none text-sm text-dark-800"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-600 transition-colors btn-lift"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Suppression...' : 'Confirmer'}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-700 text-sm hover:bg-red-100 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

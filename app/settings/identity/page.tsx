'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  ShieldCheck,
  Upload,
  Camera,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Eye,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

type Step = 'intro' | 'document' | 'selfie' | 'processing' | 'result';
type DocumentType = 'passport' | 'national_id' | 'drivers_license' | 'residence_permit';

const DOC_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'national_id', label: "Carte nationale d'identité" },
  { value: 'passport', label: 'Passeport' },
  { value: 'drivers_license', label: 'Permis de conduire' },
  { value: 'residence_permit', label: 'Titre de séjour' },
];

const COUNTRY_OPTIONS = [
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'CA', label: 'Canada' },
  { value: 'OTHER', label: 'Autre' },
];

export default function IdentityVerificationPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>('intro');
  const [documentType, setDocumentType] = useState<DocumentType>('national_id');
  const [documentCountry, setDocumentCountry] = useState('FR');
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id_verified: boolean;
    requires_admin_review: boolean;
    match_score: number;
    faces_detected: boolean;
    reason: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Le fichier doit être une image'); return; }
    if (file.size > 5 * 1024 * 1024) { setError("L'image ne doit pas dépasser 5 Mo"); return; }
    setError(null);
    const b64 = await fileToBase64(file);
    setDocumentImage(b64);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setError("Impossible d'accéder à la caméra. Autorise l'accès ou utilise un fichier.");
    }
  };

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setCameraActive(false);
  }, [cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const b64 = canvas.toDataURL('image/jpeg', 0.9);
    setSelfieImage(b64);
    stopCamera();
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Le fichier doit être une image'); return; }
    setError(null);
    const b64 = await fileToBase64(file);
    setSelfieImage(b64);
  };

  const handleSubmit = async () => {
    if (!documentImage || !selfieImage) return;
    setStep('processing');
    setError(null);

    try {
      const res = await fetch('/api/identity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentBase64: documentImage,
          selfieBase64: selfieImage,
          documentType,
          documentCountry,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la vérification');
        setStep('selfie');
        return;
      }

      setResult(data);
      setStep('result');
    } catch {
      setError('Erreur réseau. Réessaie.');
      setStep('selfie');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neu-base flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!profile) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step === 'intro' ? router.push('/settings') : setStep('intro')}
            className="inline-flex items-center gap-1 text-sm text-dark-500 hover:text-dark-800 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 'intro' ? 'Retour aux paramètres' : 'Recommencer'}
          </button>
          <h1 className="text-2xl font-bold text-dark-800">Vérification d'identité</h1>
          <p className="text-dark-500 text-sm mt-1">Niveau 2 — Identité vérifiée</p>
        </div>

        {/* Progress steps */}
        {step !== 'result' && (
          <div className="flex items-center gap-2 mb-8">
            {(['document', 'selfie', 'processing'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step === s ? 'bg-purple-600 text-white' :
                  (step === 'processing' && i < 2) || (step === 'selfie' && i < 1) ? 'bg-neon-700 text-white' :
                  'bg-silver-200 text-dark-500'
                }`}>
                  {(step === 'processing' && i < 2) || (step === 'selfie' && i < 1) ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-1 rounded-full ${step === 'selfie' && i === 0 ? 'bg-neon-700' : step === 'processing' ? 'bg-neon-700' : 'bg-silver-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* ── INTRO ── */}
        {step === 'intro' && (
          <div className="card p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-dark-800 mb-2">Comment ça marche ?</h2>
              <p className="text-sm text-dark-500">En 2 étapes simples, ton identité est vérifiée par IA.</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: FileText, title: 'Pièce d\'identité', desc: 'Prends en photo ta carte d\'identité, passeport ou permis de conduire.' },
                { icon: Camera, title: 'Selfie', desc: 'Prends un selfie en temps réel pour confirmer que c\'est bien toi.' },
                { icon: ShieldCheck, title: 'Analyse IA', desc: 'Notre IA compare les visages et valide automatiquement en quelques secondes.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3 bg-silver-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark-800 text-sm">{title}</p>
                    <p className="text-xs text-dark-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              <p className="font-semibold mb-0.5">Confidentialité</p>
              <p>Tes documents sont stockés de façon chiffrée et supprimés automatiquement après 30 jours. Le score de correspondance n'est jamais affiché publiquement.</p>
            </div>
            <button
              onClick={() => setStep('document')}
              className="w-full py-3 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              Commencer <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── DOCUMENT ── */}
        {step === 'document' && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-dark-800 mb-1">Étape 1 — Pièce d'identité</h2>
              <p className="text-sm text-dark-500">Prends une photo claire, sans reflet, de l'ensemble du document.</p>
            </div>

            {error && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg text-sm text-pink-700 flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Type de document */}
            <div>
              <label className="block text-xs font-semibold text-dark-600 mb-2">Type de document</label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDocumentType(opt.value)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${documentType === opt.value ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-silver-300 text-dark-600 hover:border-silver-400'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pays */}
            <div>
              <label className="block text-xs font-semibold text-dark-600 mb-2">Pays émetteur</label>
              <select
                value={documentCountry}
                onChange={(e) => setDocumentCountry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-silver-400 focus:border-purple-600 outline-none text-sm"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Upload */}
            <div>
              <label className="block text-xs font-semibold text-dark-600 mb-2">Photo du document</label>
              {documentImage ? (
                <div className="relative">
                  <img src={documentImage} alt="Document" className="w-full rounded-lg object-cover max-h-48" />
                  <button
                    onClick={() => setDocumentImage(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => docInputRef.current?.click()}
                  className="border-2 border-dashed border-silver-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <Upload className="w-8 h-8 text-dark-400 mx-auto mb-2" />
                  <p className="text-sm text-dark-600 font-medium">Clique pour importer</p>
                  <p className="text-xs text-dark-400">JPG, PNG — 5 Mo max</p>
                </div>
              )}
              <input
                ref={docInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('intro')} className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 text-sm font-medium">
                Retour
              </button>
              <button
                onClick={() => { setError(null); setStep('selfie'); }}
                disabled={!documentImage}
                className="flex-[2] py-3 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── SELFIE ── */}
        {step === 'selfie' && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-dark-800 mb-1">Étape 2 — Selfie</h2>
              <p className="text-sm text-dark-500">Prends un selfie face à la caméra, dans un endroit bien éclairé.</p>
            </div>

            {error && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg text-sm text-pink-700 flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Caméra live ou image capturée */}
            {selfieImage ? (
              <div className="relative">
                <img src={selfieImage} alt="Selfie" className="w-full rounded-lg object-cover max-h-64" />
                <button
                  onClick={() => setSelfieImage(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : cameraActive ? (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-end justify-center pb-4 gap-3">
                  <button
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-white border-4 border-gray-300 hover:border-purple-500 transition-colors flex items-center justify-center"
                  >
                    <Camera className="w-6 h-6 text-dark-800" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={startCamera}
                  className="w-full py-4 rounded-lg border-2 border-dashed border-silver-300 hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center gap-2"
                >
                  <Camera className="w-8 h-8 text-dark-400" />
                  <span className="text-sm font-medium text-dark-600">Prendre un selfie</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-silver-200" />
                  <span className="text-xs text-dark-400">ou</span>
                  <div className="flex-1 h-px bg-silver-200" />
                </div>
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full py-3 rounded-lg border border-silver-300 text-dark-600 text-sm flex items-center justify-center gap-2 hover:bg-silver-50 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Importer depuis la galerie
                </button>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
              </div>
            )}

            <div className="p-3 bg-silver-50 rounded-lg text-xs text-dark-500 flex items-start gap-2">
              <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Regarde droit dans la caméra, retire lunettes et chapeau, assure-toi que ton visage est bien éclairé.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('document')} className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 text-sm font-medium">
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selfieImage}
                className="flex-[2] py-3 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Vérifier mon identité <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === 'processing' && (
          <div className="card p-10 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-800 mb-2">Analyse en cours…</h2>
              <p className="text-sm text-dark-500">Notre IA compare les visages. Cela prend quelques secondes.</p>
            </div>
            <div className="space-y-2">
              {['Analyse du document', 'Détection du visage', 'Comparaison biométrique'].map((s) => (
                <div key={s} className="flex items-center gap-3 p-2 rounded-lg bg-silver-50">
                  <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin flex-shrink-0" />
                  <span className="text-sm text-dark-600">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === 'result' && result && (
          <div className="card p-8 space-y-6 text-center">
            {result.id_verified ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-neon-100 flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-neon-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-dark-800 mb-2">Identité vérifiée !</h2>
                  <p className="text-dark-500">Ton profil est maintenant au niveau 2. Tu as accès à toutes les fonctionnalités de sécurité.</p>
                </div>
                <div className="p-4 bg-neon-50 rounded-lg border border-neon-200">
                  <p className="text-sm font-semibold text-neon-700">Niveau 2 — Identité vérifiée</p>
                  <p className="text-xs text-neon-600 mt-1">Badge visible sur ton profil public</p>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full py-3 rounded-lg bg-neon-700 text-white font-semibold text-sm hover:bg-neon-600 transition-colors"
                >
                  Retour aux paramètres
                </button>
              </>
            ) : result.requires_admin_review ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-800 mb-2">Révision en cours</h2>
                  <p className="text-dark-500 text-sm">Le score de correspondance est ambigu. Un modérateur va examiner ta vérification sous 24-48h. Tu seras notifié.</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-left">
                  <p className="text-sm text-yellow-800">{result.reason}</p>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm"
                >
                  Compris
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-pink-100 flex items-center justify-center">
                  <X className="w-10 h-10 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-800 mb-2">Vérification échouée</h2>
                  <p className="text-dark-500 text-sm">Les visages ne correspondent pas ou la qualité des images est insuffisante.</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 text-left">
                  <p className="text-sm text-pink-700">{result.reason}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setDocumentImage(null); setSelfieImage(null); setStep('document'); setResult(null); }}
                    className="flex-1 py-3 rounded-lg bg-purple-600 text-white text-sm font-semibold"
                  >
                    Réessayer
                  </button>
                  <button
                    onClick={() => router.push('/settings')}
                    className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

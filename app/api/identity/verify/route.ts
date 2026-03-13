/**
 * API Route: Vérification d'identité
 * POST /api/identity/verify
 *
 * Accepte un document d'identité + selfie (images en base64),
 * utilise l'API Claude (vision) pour comparer les visages,
 * puis enregistre le résultat dans identity_verifications.
 *
 * Nécessite : ANTHROPIC_API_KEY dans les variables d'environnement.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SELFIE_PASS_THRESHOLD = 80;   // score ≥ 80 → auto-approuvé
const SELFIE_FAIL_THRESHOLD = 40;   // score ≤ 40 → rejeté
// entre 40 et 80 → révision admin

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────
    const body = await req.json();
    const { documentBase64, selfieBase64, documentType, documentCountry } = body as {
      documentBase64: string;
      selfieBase64: string;
      documentType: string;
      documentCountry: string;
    };

    if (!documentBase64 || !selfieBase64) {
      return NextResponse.json({ error: 'Document et selfie requis' }, { status: 400 });
    }

    // ── Rate limiting (max 3 tentatives / jour) ───────────
    const { data: existing } = await supabase
      .from('identity_verifications')
      .select('verification_attempts, last_attempt_at, id_verified')
      .eq('user_id', user.id)
      .single();

    if (existing?.id_verified) {
      return NextResponse.json({ error: 'Identité déjà vérifiée' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const lastAttemptDay = existing?.last_attempt_at?.slice(0, 10);
    const attemptsToday = lastAttemptDay === today ? (existing?.verification_attempts || 0) : 0;

    if (attemptsToday >= 3) {
      return NextResponse.json({ error: "Trop de tentatives aujourd'hui. Réessaie demain." }, { status: 429 });
    }

    // ── Claude Vision : comparaison faciale ───────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Extrait le media type depuis le base64 data URI ou assume jpeg
    const getMediaType = (b64: string): 'image/jpeg' | 'image/png' | 'image/webp' => {
      if (b64.startsWith('data:image/png')) return 'image/png';
      if (b64.startsWith('data:image/webp')) return 'image/webp';
      return 'image/jpeg';
    };

    const stripPrefix = (b64: string) => b64.replace(/^data:image\/[a-z]+;base64,/, '');

    const docMediaType = getMediaType(documentBase64);
    const selfieMediaType = getMediaType(selfieBase64);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Tu es un système de vérification d'identité. Compare le visage sur la pièce d'identité (image 1) avec le selfie (image 2).

Réponds UNIQUEMENT avec un objet JSON au format suivant (rien d'autre) :
{
  "match_score": <nombre entier entre 0 et 100>,
  "faces_detected": <true|false>,
  "confidence": <"high"|"medium"|"low">,
  "reason": "<explication courte en français>"
}

Règles de score :
- 85-100 : correspondance certaine (même personne)
- 60-84 : correspondance probable (révision humaine recommandée)
- 40-59 : correspondance incertaine
- 0-39 : visages différents ou qualité insuffisante

Si tu ne détectes pas de visage dans l'une des images, retourne faces_detected: false et match_score: 0.`,
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: docMediaType, data: stripPrefix(documentBase64) },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: selfieMediaType, data: stripPrefix(selfieBase64) },
            },
          ],
        },
      ],
    });

    // Parse la réponse Claude
    let matchScore = 0;
    let facesDetected = false;
    let reason = 'Analyse impossible';
    let requiresAdminReview = false;

    try {
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        matchScore = Math.max(0, Math.min(100, Number(parsed.match_score) || 0));
        facesDetected = Boolean(parsed.faces_detected);
        reason = parsed.reason || reason;
      }
    } catch {
      // Si parsing échoue, on reste avec matchScore = 0
    }

    // Déterminer le résultat
    let idVerified = false;
    let adminReviewReason: string | null = null;

    if (!facesDetected) {
      reason = 'Aucun visage détecté. Vérifiez la qualité des images.';
    } else if (matchScore >= SELFIE_PASS_THRESHOLD) {
      idVerified = true;
    } else if (matchScore <= SELFIE_FAIL_THRESHOLD) {
      idVerified = false;
    } else {
      // Zone grise → révision admin
      requiresAdminReview = true;
      adminReviewReason = 'low_selfie_confidence';
    }

    // ── Upload images dans Supabase Storage (bucket privé) ──
    // On stocke seulement si la vérification est en cours/réussie
    // Note : le bucket 'identity-docs' doit être créé en mode privé
    let docPath: string | null = null;
    let selfiePath: string | null = null;

    try {
      const docBuffer = Buffer.from(stripPrefix(documentBase64), 'base64');
      const selfieBuffer = Buffer.from(stripPrefix(selfieBase64), 'base64');

      const docFileName = `${user.id}/doc-${Date.now()}.jpg`;
      const selfieFileName = `${user.id}/selfie-${Date.now()}.jpg`;

      const { error: docUploadError } = await supabase.storage
        .from('identity-docs')
        .upload(docFileName, docBuffer, { contentType: 'image/jpeg', upsert: true });

      if (!docUploadError) docPath = docFileName;

      const { error: selfieUploadError } = await supabase.storage
        .from('identity-docs')
        .upload(selfieFileName, selfieBuffer, { contentType: 'image/jpeg', upsert: true });

      if (!selfieUploadError) selfiePath = selfieFileName;
    } catch {
      // Upload optionnel, ne bloque pas la vérification
    }

    // ── Enregistrement dans identity_verifications ─────────
    const newAttempts = attemptsToday + 1;
    const now = new Date().toISOString();

    const newLevel = idVerified ? 2 : (existing?.id_verified ? 2 : 0);
    const newLevelName = idVerified ? 'id_verified' : 'basic';

    const upsertData = {
      user_id: user.id,
      level: newLevel,
      level_name: newLevelName,
      id_verified: idVerified,
      id_verified_at: idVerified ? now : null,
      id_document_type: documentType || null,
      id_document_country: documentCountry || null,
      id_document_path: docPath,
      selfie_match_score: matchScore,
      selfie_match_passed: idVerified,
      selfie_verified_at: now,
      selfie_path: selfiePath,
      admin_review_required: requiresAdminReview,
      admin_review_reason: adminReviewReason,
      verification_attempts: newAttempts,
      last_attempt_at: now,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from('identity_verifications')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error upserting identity verification:', upsertError);
    }

    // Mettre à jour le profil si vérifié
    if (idVerified) {
      await supabase
        .from('profiles')
        .update({ /* on pourrait ajouter un champ identity_verified */ updated_at: now } as Record<string, string>)
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      id_verified: idVerified,
      requires_admin_review: requiresAdminReview,
      match_score: matchScore,
      faces_detected: facesDetected,
      reason,
    });

  } catch (error) {
    console.error('Identity verification error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

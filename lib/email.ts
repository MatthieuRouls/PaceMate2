/**
 * Transactional email service — Resend
 *
 * Setup:
 *   1. npm install resend
 *   2. Add RESEND_API_KEY and EMAIL_FROM to .env.local
 *   3. Verify your domain in Resend dashboard
 *
 * If RESEND_API_KEY is not set, emails are silently skipped (non-blocking).
 */

import { logger } from '@/lib/logger';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('[email] RESEND_API_KEY not set — skipping email', { to: payload.to, subject: payload.subject });
    return;
  }

  const from = process.env.EMAIL_FROM ?? 'PaceMate <noreply@pacemate.app>';

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      logger.warn('[email] Resend send error:', error);
    }
  } catch (err) {
    logger.warn('[email] sendEmail error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactional email templates
// ─────────────────────────────────────────────────────────────────────────────

export async function sendSessionJoinEmail(opts: {
  creatorEmail: string;
  joinerName: string;
  sessionTitle: string;
  sessionDate: string;
  sessionId: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pacemate.app';
  const sessionUrl = `${baseUrl}/sessions/${opts.sessionId}`;
  const formattedDate = new Date(opts.sessionDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  await sendEmail({
    to: opts.creatorEmail,
    subject: `${opts.joinerName} rejoint votre run "${opts.sessionTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#ec4899;">Nouveau participant !</h2>
        <p><strong>${opts.joinerName}</strong> vient de rejoindre votre sortie :</p>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-size:18px;font-weight:600;">${opts.sessionTitle}</p>
          <p style="margin:4px 0 0;color:#6b7280;">${formattedDate}</p>
        </div>
        <a href="${sessionUrl}" style="display:inline-block;background:#ec4899;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Voir la session
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">PaceMate — Courez ensemble.</p>
      </div>
    `,
  });
}

export async function sendFriendRequestEmail(opts: {
  recipientEmail: string;
  requesterName: string;
  requesterAvatarUrl?: string | null;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pacemate.app';

  await sendEmail({
    to: opts.recipientEmail,
    subject: `${opts.requesterName} veut courir avec vous sur PaceMate`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#ec4899;">Nouvelle demande de run !</h2>
        <p><strong>${opts.requesterName}</strong> vous a envoyé une demande d'ami sur PaceMate.</p>
        <a href="${baseUrl}/friends" style="display:inline-block;background:#ec4899;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
          Voir la demande
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">PaceMate — Courez ensemble.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(opts: {
  email: string;
  username: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pacemate.app';

  await sendEmail({
    to: opts.email,
    subject: 'Bienvenue sur PaceMate !',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#ec4899;">Bienvenue, ${opts.username} !</h2>
        <p>Vous faites maintenant partie de la communauté PaceMate. Trouvez vos prochains partenaires de run et courez ensemble.</p>
        <a href="${baseUrl}/sessions" style="display:inline-block;background:#ec4899;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
          Trouver une sortie
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">PaceMate — Courez ensemble.</p>
      </div>
    `,
  });
}

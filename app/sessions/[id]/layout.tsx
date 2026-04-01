import type { Metadata } from 'next';
import { getSessionDetails } from '@/lib/actions';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pacemate.app';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const session = await getSessionDetails(id);
    if (!session) return {};

    const date = new Date(session.start_time).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const title = `${session.title} — ${date}`;
    const description = session.description
      ? session.description.slice(0, 160)
      : `${session.distance_km} km · ${session.location_name} · ${date}`;

    const url = `${siteUrl}/sessions/${id}`;

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        url,
        title,
        description,
        images: [
          {
            url: '/og-default.png',
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/og-default.png'],
      },
    };
  } catch {
    return {};
  }
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

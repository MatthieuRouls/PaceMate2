import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PublicProfileClient from './PublicProfileClient';
import { getPublicProfile } from '@/lib/actions';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: 'Profil introuvable' };

  return {
    title: `${profile.username} — Profil runner`,
    description: profile.bio
      ? profile.bio.slice(0, 150)
      : `${profile.username} court sur PaceMate. Niveau ${profile.running_level}.`,
    openGraph: {
      title: `${profile.username} | PaceMate`,
      description: profile.bio || `Runner niveau ${profile.running_level}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) notFound();

  return <PublicProfileClient profile={profile} />;
}

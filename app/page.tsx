'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PhoneMockup from '@/components/ui/PhoneMockup';
import Footer from '@/components/layout/Footer';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';

export default function Home() {
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessions, teams] = await Promise.all([
          getUpcomingSessions(3),
          getTopTeams(3),
        ]);
        setUpcomingSessions(sessions);
        setTopTeams(teams);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const features = [
    {
      number: '1',
      title: 'Trouve une session',
      description: 'Parcours les sessions disponibles près de chez toi selon ton niveau et tes objectifs',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      number: '2',
      title: 'Inscris-toi',
      description: 'Rejoins le groupe en un clic et prépare-toi à courir avec ta nouvelle team',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      number: '3',
      title: 'Cours ensemble',
      description: 'Profite de la sortie, progresse et gagne des XP pour monter en niveau',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl" />

        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left column - Text */}
            <div className="relative z-10">
              <h1 className="mb-4">
                Trouve ton <span className="text-gradient">binôme running</span>
              </h1>
              <p className="text-gray-600 mb-6">
                Rejoins une communauté de coureurs passionnés, partage tes sorties et progresse ensemble vers tes objectifs.
              </p>
              <div className="flex gap-3">
                <Link href="/sessions">
                  <Button variant="gradient" size="md">
                    Explorer les sorties
                  </Button>
                </Link>
                <Link href="/sessions/create">
                  <Button variant="outline" size="md">
                    Créer une sortie
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gradient mb-1">500+</div>
                  <div className="text-xs text-gray-600">Runners actifs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gradient mb-1">1.2k+</div>
                  <div className="text-xs text-gray-600">Sessions réalisées</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gradient mb-1">50+</div>
                  <div className="text-xs text-gray-600">Équipes actives</div>
                </div>
              </div>
            </div>

            {/* Right column - Phone Mockup */}
            <div className="relative z-10 hidden lg:flex justify-center">
              <div style={{ transform: 'scale(0.7)' }}>
                <PhoneMockup />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Comment ça marche */}
      <section className="py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-50/30 to-transparent" />

        <Container>
          <div className="text-center mb-10">
            <h2 className="mb-3">Comment ça marche ?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Commence ton aventure running en 3 étapes simples
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {features.map((feature) => (
              <Card key={feature.number} variant="glass" padding="md" hover>
                <div className="relative">
                  {/* Number badge */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {feature.number}
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center text-pink-600 mb-4">
                    {feature.icon}
                  </div>

                  <h3 className="font-bold mb-2 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Sessions à venir */}
      <section className="py-12">
        <Container>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="mb-1">Prochaines sorties</h2>
              <p className="text-sm text-gray-600">Rejoins une session près de chez toi</p>
            </div>
            <Link href="/sessions">
              <Button variant="outline">
                Voir toutes les sessions
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <Card padding="xl">
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucune session disponible</h3>
                <p className="text-gray-600 mb-6">
                  Sois le premier à créer une sortie dans ta région !
                </p>
                <Link href="/sessions/create">
                  <Button variant="gradient">
                    Créer la première session
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </Container>
      </section>

      {/* Top équipes */}
      <section className="py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent" />

        <Container>
          <div className="text-center mb-10">
            <h2 className="mb-2">🏆 Top équipes</h2>
            <p className="text-gray-600">
              Les équipes qui dominent le classement ce mois-ci
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

                return (
                  <Card
                    key={team.id}
                    variant="glass"
                    padding="md"
                    hover
                  >
                    <div className="text-center">
                      {/* Medal */}
                      <div className="text-4xl mb-3">{medal}</div>

                      {/* Team name */}
                      <h3 className="font-bold mb-1">{team.name}</h3>
                      <p className="text-xs text-gray-600 mb-3">{position}ère place</p>

                      {/* Description */}
                      {team.description && (
                        <p className="text-gray-600 text-xs mb-4 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200/50">
                        <div>
                          <div className="text-xl font-bold text-gradient mb-1">
                            {team.members_count || 0}
                          </div>
                          <div className="text-xs text-gray-600">Membres</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-gradient mb-1">
                            {(team.total_distance || 0).toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-600">Km parcourus</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card padding="xl">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏃‍♂️</div>
                <h3 className="text-xl font-semibold mb-2">Aucune équipe pour le moment</h3>
                <p className="text-gray-600">
                  Les classements apparaîtront une fois les premières équipes créées
                </p>
              </div>
            </Card>
          )}

          <div className="text-center mt-8">
            <Link href="/teams">
              <Button variant="outline" size="md">
                Voir le classement complet
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

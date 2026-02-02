'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';
import { useAuth } from '@/components/providers/AuthProvider';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for GSAP animations
  const heroRef = useRef<HTMLDivElement>(null);
  const sloganRef = useRef<HTMLHeadingElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef<HTMLElement>(null);
  const teamsRef = useRef<HTMLElement>(null);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!authLoading && profile) {
      router.replace('/dashboard');
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessions, teams] = await Promise.all([
          getUpcomingSessions(6),
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

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance animation
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(sloganRef.current, {
        y: 100,
        opacity: 0,
        duration: 1.2,
        delay: 0.5,
      })
      .from(scrollIndicatorRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.8,
      }, '-=0.4');

      // Parallax effect on hero image
      gsap.to(heroRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        y: 200,
        scale: 1.1,
      });

      // Fade out slogan on scroll
      gsap.to(sloganRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        opacity: 0,
        y: -100,
      });

      // Sessions section reveal
      if (sessionsRef.current) {
        gsap.from(sessionsRef.current, {
          scrollTrigger: {
            trigger: sessionsRef.current,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 1,
          },
          opacity: 0,
          y: 100,
        });

        // Animate session cards
        const cards = sessionsRef.current.querySelectorAll('.session-card');
        gsap.from(cards, {
          scrollTrigger: {
            trigger: sessionsRef.current,
            start: 'top 70%',
          },
          opacity: 0,
          y: 60,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out',
        });
      }

      // Teams section reveal
      if (teamsRef.current) {
        gsap.from(teamsRef.current, {
          scrollTrigger: {
            trigger: teamsRef.current,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 1,
          },
          opacity: 0,
          y: 100,
        });

        // Animate team cards
        const teamCards = teamsRef.current.querySelectorAll('.team-card');
        gsap.from(teamCards, {
          scrollTrigger: {
            trigger: teamsRef.current,
            start: 'top 70%',
          },
          opacity: 0,
          y: 60,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out',
        });
      }
    });

    return () => ctx.revert();
  }, [loading, upcomingSessions, topTeams]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Page */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Hero Image with parallax */}
        <div ref={heroRef} className="absolute inset-0 z-0">
          <Image
            src="/PhotoAccueil.jpeg"
            alt="Runners"
            fill
            priority
            className="object-cover brightness-[0.6]"
            quality={100}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>

        {/* Slogan */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <h1
            ref={sloganRef}
            className="text-center"
          >
            <div className="text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-6 leading-tight">
              Cours avec
              <br />
              <span className="text-primary-500">ta tribu</span>
            </div>
            <p className="text-xl md:text-2xl lg:text-3xl text-white/90 font-light">
              Trouve ton rythme, ensemble
            </p>
          </h1>
        </div>

        {/* Scroll Indicator */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce"
        >
          <div className="flex flex-col items-center gap-2 text-white/80">
            <span className="text-sm font-medium tracking-wider uppercase">Découvrir</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Sessions Feed Section */}
      <section
        ref={sessionsRef}
        className="py-32 px-4 sm:px-6 lg:px-8 bg-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-secondary-600 mb-6">
              Sessions à venir
            </h2>
            <div className="w-24 h-1 bg-primary-500 mx-auto mb-6" />
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Rejoins une session ou organise la tienne. La communauté t'attend.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="session-card">
                  <SessionCard session={session} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-xl text-gray-600">Aucune session disponible pour le moment</p>
            </div>
          )}

          <div className="text-center mt-16">
            <Link
              href="/sessions"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Toutes les sessions
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Teams Section */}
      <section
        ref={teamsRef}
        className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-secondary-600 mb-6">
              Équipes leaders
            </h2>
            <div className="w-24 h-1 bg-primary-500 mx-auto mb-6" />
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Les équipes les plus actives qui font vibrer la communauté
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medals = ['🥇', '🥈', '🥉'];

                return (
                  <div
                    key={team.id}
                    className="team-card bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-100 hover:border-primary-500"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <span className="text-6xl">{medals[index]}</span>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-primary-600">
                          #{position}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-secondary-600 mb-3">
                      {team.name}
                    </h3>

                    {team.description && (
                      <p className="text-gray-600 mb-6 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    <div className="flex gap-8 pt-6 border-t border-gray-100">
                      <div>
                        <div className="text-3xl font-bold text-secondary-600">
                          {team.members_count || 0}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Membres</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-primary-600">
                          {(team.total_distance || 0).toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Km parcourus</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <p className="text-xl text-gray-600">Aucune équipe pour le moment</p>
            </div>
          )}

          <div className="text-center mt-16">
            <Link
              href="/teams"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-secondary-600 font-bold rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-gray-50 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Voir toutes les équipes
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-secondary-600 to-secondary-700">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Prêt à courir ?
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto">
            Rejoins des milliers de runners qui partagent leur passion chaque jour
          </p>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-3 px-10 py-5 bg-primary-500 text-white font-bold text-lg rounded-2xl hover:bg-primary-600 transition-all shadow-2xl hover:shadow-primary-500/50 transform hover:scale-105"
          >
            Commencer maintenant
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/PaceMateLogo_vert.svg"
                alt="PaceMate Logo"
                width={32}
                height={32}
              />
              <span className="text-xl font-bold text-secondary-600">
                PaceMate
              </span>
            </div>

            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="#" className="hover:text-primary-500 transition-colors">
                À propos
              </Link>
              <Link href="#" className="hover:text-primary-500 transition-colors">
                Contact
              </Link>
              <Link href="#" className="hover:text-primary-500 transition-colors">
                Confidentialité
              </Link>
              <Link href="#" className="hover:text-primary-500 transition-colors">
                CGU
              </Link>
            </div>

            <div className="text-sm text-gray-500">
              © 2026 PaceMate. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

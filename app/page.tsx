'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';

// Cette page n'est accessible que pour les visiteurs non connectés.
// Le middleware redirige les utilisateurs connectés vers /dashboard.

// ============================================
// MATCHING VISUAL SYSTEM - SVG Components
// ============================================

// Motif principal: deux trajectoires qui convergent avec point de match
function MatchingMotif({
  className = '',
  animated = true,
  scale = 1,
  glowIntensity = 'normal',
  delayedStart = false,
}: {
  className?: string;
  animated?: boolean;
  scale?: number;
  glowIntensity?: 'subtle' | 'normal' | 'strong';
  delayedStart?: boolean;
}) {
  const glowOpacity = glowIntensity === 'subtle' ? 0.3 : glowIntensity === 'strong' ? 0.7 : 0.5;
  const delayClass = delayedStart ? 'animation-delay-800' : '';

  return (
    <svg
      viewBox="0 0 200 120"
      className={`${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      <defs>
        <linearGradient id="trajectory1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="trajectory2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.8" />
        </linearGradient>
        <filter id="matchGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Trajectory 1 - Arc from top-left */}
      <path
        d="M 10 100 Q 60 80, 100 60"
        stroke="url(#trajectory1)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className={animated ? `animate-trajectory-draw ${delayClass}` : ''}
      />

      {/* Trajectory 2 - Arc from top-right */}
      <path
        d="M 190 100 Q 140 80, 100 60"
        stroke="url(#trajectory2)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className={animated ? `animate-trajectory-draw-reverse ${delayClass}` : ''}
      />

      {/* Match point with glow */}
      <circle
        cx="100"
        cy="60"
        r="8"
        fill="#ec4899"
        filter="url(#matchGlow)"
        opacity={glowOpacity}
        className={animated ? `animate-match-pulse-delayed ${delayClass}` : ''}
      />
      <circle
        cx="100"
        cy="60"
        r="4"
        fill="#ec4899"
        className={animated ? `animate-match-pulse-delayed ${delayClass}` : ''}
      />
    </svg>
  );
}

// Mini motif pour les étapes et piliers
function MiniMatchMotif({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className}>
      <path
        d="M 5 35 Q 20 25, 30 20"
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 55 35 Q 40 25, 30 20"
        stroke="#14b8a6"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="30" cy="20" r="4" fill="#ec4899" />
    </svg>
  );
}

// Background pattern avec trajectoires
function TrajectoryBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="absolute w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bgLine1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="bgLine2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Large sweeping curves */}
        <path
          d="M -100 600 Q 300 400, 600 300 T 1200 100"
          stroke="url(#bgLine1)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 1400 600 Q 1000 400, 700 300 T 100 100"
          stroke="url(#bgLine2)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
}

// How It Works - Animated matching SVG
function HowItWorksMatchSVG({ isVisible }: { isVisible: boolean }) {
  return (
    <svg viewBox="0 0 800 100" className="w-full h-24 mt-8">
      <defs>
        <linearGradient id="stepLine1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="stepLine2" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.8" />
        </linearGradient>
        <filter id="matchGlowLarge" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Step 1 indicator */}
      <circle
        cx="130"
        cy="50"
        r="8"
        fill="#10b981"
        className={`transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: '0.2s' }}
      />

      {/* Trajectory from Step 1 to center */}
      <path
        d="M 145 50 Q 270 30, 400 50"
        stroke="url(#stepLine1)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className={`transition-all duration-1000 ${isVisible ? 'stroke-dashoffset-0' : ''}`}
        style={{
          strokeDasharray: 300,
          strokeDashoffset: isVisible ? 0 : 300,
          transitionDelay: '0.4s',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {/* Step 3 indicator */}
      <circle
        cx="670"
        cy="50"
        r="8"
        fill="#14b8a6"
        className={`transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: '0.3s' }}
      />

      {/* Trajectory from Step 3 to center */}
      <path
        d="M 655 50 Q 530 30, 400 50"
        stroke="url(#stepLine2)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className={`transition-all duration-1000`}
        style={{
          strokeDasharray: 300,
          strokeDashoffset: isVisible ? 0 : -300,
          transitionDelay: '0.5s',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {/* Match point at center (Step 2) */}
      <circle
        cx="400"
        cy="50"
        r="16"
        fill="#ec4899"
        filter="url(#matchGlowLarge)"
        className={`transition-all duration-500 ${isVisible ? 'opacity-60 scale-100' : 'opacity-0 scale-0'}`}
        style={{
          transitionDelay: '1s',
          transformOrigin: '400px 50px',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
      <circle
        cx="400"
        cy="50"
        r="10"
        fill="#ec4899"
        className={`transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} ${isVisible ? 'animate-match-pulse' : ''}`}
        style={{
          transitionDelay: '1.1s',
          transformOrigin: '400px 50px',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
    </svg>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [testimonialOffset, setTestimonialOffset] = useState(0);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const heroRef = useRef<HTMLElement | null>(null);
  const testimonialsRef = useRef<HTMLElement | null>(null);

  // Hero load animation
  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll handler for hero fade and parallax
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    setScrollY(currentScrollY);

    // Testimonials parallax
    if (testimonialsRef.current) {
      const rect = testimonialsRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
        setTestimonialOffset((progress - 0.5) * 80); // ±40px
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  // Calculate hero fade based on scroll
  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroBlur = Math.min(6, scrollY / 100);
  const heroScale = 1 + Math.min(0.08, scrollY / 5000);

  // Stats placeholders (en prod, viendraient de l'API)
  const stats = {
    runners: 2847,
    sessions: 1203,
    cities: 42,
    matchesThisWeek: 156,
  };

  // Testimonials
  const testimonials = [
    {
      name: 'Marie L.',
      city: 'Paris 15e',
      text: "J'ai trouvé mon groupe en 2 jours. On court ensemble tous les mardis maintenant.",
      avatar: 'from-pink-400 to-purple-500',
    },
    {
      name: 'Thomas R.',
      city: 'Lyon',
      text: "Le matching par allure, c'est exactement ce qu'il me fallait. Plus de runs où je suis largué.",
      avatar: 'from-neon-400 to-teal-500',
    },
    {
      name: 'Sophie M.',
      city: 'Bordeaux',
      text: "Super ambiance, des gens motivés. PaceMate m'a redonné envie de courir régulièrement.",
      avatar: 'from-orange-400 to-red-500',
    },
  ];

  // Avatar gradients for trust section
  const avatarGradients = [
    'from-pink-400 to-purple-500',
    'from-neon-400 to-teal-500',
    'from-orange-400 to-red-500',
    'from-blue-400 to-indigo-500',
    'from-yellow-400 to-orange-500',
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ============================================ */}
      {/* GLOBAL STYLES & ANIMATIONS */}
      {/* ============================================ */}
      <style jsx global>{`
        /* Easing global */
        :root {
          --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Animation delays */
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-800 { animation-delay: 0.8s; }
        .animation-delay-1000 { animation-delay: 1s; }

        /* Trajectory draw animations */
        @keyframes trajectoryDraw {
          0% { stroke-dashoffset: 150; opacity: 0; }
          30% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes trajectoryDrawReverse {
          0% { stroke-dashoffset: -150; opacity: 0; }
          30% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        .animate-trajectory-draw {
          stroke-dasharray: 150;
          animation: trajectoryDraw 1.4s var(--ease-out-expo) forwards;
        }
        .animate-trajectory-draw-reverse {
          stroke-dasharray: 150;
          animation: trajectoryDrawReverse 1.4s var(--ease-out-expo) forwards;
        }

        /* Match pulse animations */
        @keyframes matchPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes matchPulseDelayed {
          0%, 60% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .animate-match-pulse {
          transform-origin: center;
          animation: matchPulse 2.4s ease-in-out infinite;
        }
        .animate-match-pulse-delayed {
          transform-origin: center;
          animation: matchPulseDelayed 1.6s var(--ease-out-expo) forwards, matchPulse 2.4s ease-in-out 1.6s infinite;
        }

        /* Fade animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s var(--ease-out-expo) forwards;
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.7s var(--ease-out-expo) forwards;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.7s var(--ease-out-expo) forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.6s var(--ease-out-expo) forwards;
        }

        /* Float animation */
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-gentle-float {
          animation: gentleFloat 4s ease-in-out infinite;
        }

        /* Hero background scale */
        @keyframes heroZoom {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
        .animate-hero-zoom {
          animation: heroZoom 20s ease-out forwards;
        }

        /* Section reveal */
        .section-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo);
        }
        .section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Stagger children */
        .stagger-children > * {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s var(--ease-out-expo), transform 0.5s var(--ease-out-expo);
        }
        .stagger-children.visible > *:nth-child(1) { transition-delay: 0.05s; opacity: 1; transform: translateY(0); }
        .stagger-children.visible > *:nth-child(2) { transition-delay: 0.1s; opacity: 1; transform: translateY(0); }
        .stagger-children.visible > *:nth-child(3) { transition-delay: 0.15s; opacity: 1; transform: translateY(0); }
        .stagger-children.visible > *:nth-child(4) { transition-delay: 0.2s; opacity: 1; transform: translateY(0); }
        .stagger-children.visible > *:nth-child(5) { transition-delay: 0.25s; opacity: 1; transform: translateY(0); }

        /* Avatar cascade */
        .avatar-cascade > * {
          opacity: 0;
          transform: translateY(20px) scale(0.8);
          transition: opacity 0.4s var(--ease-out-expo), transform 0.4s var(--ease-out-expo);
        }
        .avatar-cascade.visible > *:nth-child(1) { transition-delay: 0.06s; opacity: 1; transform: translateY(0) scale(1); }
        .avatar-cascade.visible > *:nth-child(2) { transition-delay: 0.12s; opacity: 1; transform: translateY(0) scale(1); }
        .avatar-cascade.visible > *:nth-child(3) { transition-delay: 0.18s; opacity: 1; transform: translateY(0) scale(1); }
        .avatar-cascade.visible > *:nth-child(4) { transition-delay: 0.24s; opacity: 1; transform: translateY(0) scale(1); }
        .avatar-cascade.visible > *:nth-child(5) { transition-delay: 0.30s; opacity: 1; transform: translateY(0) scale(1); }

        /* Benefits cards float */
        .benefit-card {
          opacity: 0;
          transform: translateY(40px) scale(0.96);
          transition: opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo), box-shadow 0.3s ease;
        }
        .benefits-visible .benefit-card:nth-child(1) { transition-delay: 0.1s; opacity: 1; transform: translateY(0) scale(1); }
        .benefits-visible .benefit-card:nth-child(2) { transition-delay: 0.2s; opacity: 1; transform: translateY(0) scale(1); }
        .benefits-visible .benefit-card:nth-child(3) { transition-delay: 0.3s; opacity: 1; transform: translateY(0) scale(1); }

        /* Product lateral reveal */
        .product-text {
          opacity: 0;
          transform: translateX(-40px);
          transition: opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo);
        }
        .product-visible .product-text {
          opacity: 1;
          transform: translateX(0);
        }
        .product-screenshot {
          opacity: 0;
          transform: translateX(40px);
          transition: opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo);
          transition-delay: 0.15s;
        }
        .product-visible .product-screenshot {
          opacity: 1;
          transform: translateX(0);
        }

        /* Final CTA climax */
        .cta-climax {
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo);
          transition-delay: 0.5s;
        }
        .cta-visible .cta-climax {
          opacity: 1;
          transform: scale(1);
        }

        /* Hover trajectory underline */
        .hover-trajectory {
          position: relative;
          overflow: hidden;
        }
        .hover-trajectory::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ec4899, transparent);
          transition: width 0.3s var(--ease-out-expo), left 0.3s var(--ease-out-expo);
        }
        .hover-trajectory:hover::before {
          width: 100%;
          left: 0;
        }
      `}</style>

      {/* ============================================ */}
      {/* SECTION 1 — HERO MATCHING (FULL-BLEED, ~110vh) */}
      {/* ============================================ */}
      <section
        ref={heroRef as any}
        className="relative w-full pt-20 flex items-center justify-center overflow-hidden"
        style={{ minHeight: '110vh' }}
      >
        {/* Background Image with zoom and scroll fade */}
        <div
          className="absolute inset-0 z-0"
          style={{
            opacity: heroOpacity,
            filter: `blur(${heroBlur}px)`,
            transform: `translateY(${scrollY * 0.15}px)`,
            transition: 'filter 0.1s ease-out',
          }}
        >
          <div className={`absolute inset-0 ${heroLoaded ? 'animate-hero-zoom' : ''}`}>
            <Image
              src="/Accueil.jpeg"
              alt="Runners finding their pace"
              fill
              priority
              className="object-cover"
              quality={100}
            />
          </div>
          {/* Gradient overlay - dark for contrast */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(8,12,10,0.6) 0%, rgba(8,12,10,0.8) 100%)',
            }}
          />
        </div>

        {/* Matching Motif - Large, centered above text */}
        <div
          className={`absolute top-32 left-1/2 -translate-x-1/2 z-10 transition-all duration-1000 ${heroLoaded ? 'opacity-90' : 'opacity-0'}`}
          style={{ transitionDelay: '0.3s' }}
        >
          <MatchingMotif
            className="w-[280px] md:w-[360px] h-auto"
            animated={heroLoaded}
            scale={1}
            glowIntensity="strong"
          />
        </div>

        {/* Glow effects */}
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-neon-500/10 rounded-full blur-3xl" />

        {/* Hero Content */}
        <div
          className="relative z-20 text-center px-6 max-w-4xl mx-auto"
          style={{
            opacity: heroOpacity,
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        >
          <h1
            className={`mb-6 ${heroLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}
          >
            <span className="block text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight">
              Find your <span className="text-neon-400">pace</span>.
            </span>
            <span className="block text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight mt-2">
              Find your <span className="text-pink-500">mate</span>.
            </span>
          </h1>

          <p
            className={`text-lg md:text-xl lg:text-2xl text-silver-300 mb-10 max-w-2xl mx-auto font-light ${heroLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.7s', animationFillMode: 'backwards' }}
          >
            PaceMate connecte les coureurs compatibles près de toi, au bon rythme.
          </p>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 ${heroLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.9s', animationFillMode: 'backwards' }}
          >
            <Link
              href="/auth/signup"
              className="group relative px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/25"
            >
              <span className="relative z-10">Créer mon compte</span>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold text-lg rounded-2xl transition-all duration-300 border border-white/20 hover:border-white/40"
            >
              Voir comment ça marche
            </a>
          </div>

          {/* Micro-crédibilité */}
          <div
            className={`flex flex-wrap items-center justify-center gap-6 text-sm text-silver-400 ${heroLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '1.1s', animationFillMode: 'backwards' }}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-500 animate-pulse" />
              {stats.runners.toLocaleString()} coureurs actifs
            </span>
            <span className="hidden sm:inline text-silver-600">•</span>
            <span>{stats.sessions.toLocaleString()} sorties créées</span>
            <span className="hidden sm:inline text-silver-600">•</span>
            <span>{stats.cities} villes</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 ${heroLoaded ? 'animate-gentle-float' : 'opacity-0'}`}
          style={{
            opacity: heroOpacity,
            transitionDelay: '1.4s',
          }}
        >
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs font-medium tracking-widest uppercase">Découvrir</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 2 — TRUST BAR (~20vh) */}
      {/* ============================================ */}
      <section
        id="trust"
        ref={setRef('trust')}
        className="py-10 px-4 bg-dark-800 border-y border-dark-700 flex items-center"
        style={{ minHeight: '20vh' }}
      >
        <div className={`max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 ${isVisible['trust'] ? 'visible' : ''}`}>
          {/* Avatars empilés avec cascade */}
          <div className="flex items-center gap-3">
            <div className={`flex -space-x-3 avatar-cascade ${isVisible['trust'] ? 'visible' : ''}`}>
              {avatarGradients.map((gradient, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} border-2 border-dark-800 flex items-center justify-center text-xs font-bold text-white`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span
              className={`text-silver-300 text-sm font-medium transition-all duration-500 ${isVisible['trust'] ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '0.4s' }}
            >
              Rejoint par <span className="text-white font-bold">+{stats.runners.toLocaleString()}</span> coureurs
            </span>
          </div>

          <div className="hidden md:block w-px h-8 bg-dark-600" />

          <span
            className={`text-silver-400 text-sm transition-all duration-500 ${isVisible['trust'] ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '0.5s' }}
          >
            Déjà actif dans <span className="text-neon-400 font-semibold">{stats.cities} villes</span>
          </span>

          <div className="hidden md:block w-px h-8 bg-dark-600" />

          <span
            className={`text-silver-400 text-sm flex items-center gap-2 transition-all duration-500 ${isVisible['trust'] ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '0.6s' }}
          >
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-pink-400 font-semibold">{stats.matchesThisWeek}</span> matchs cette semaine
          </span>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 3 — PRODUIT EN ACTION (~100vh) */}
      {/* ============================================ */}
      <section
        id="product"
        ref={setRef('product')}
        className={`px-4 sm:px-6 lg:px-8 bg-silver-50 relative flex items-center ${isVisible['product'] ? 'product-visible' : ''}`}
        style={{ minHeight: '100vh', paddingTop: '8rem', paddingBottom: '8rem' }}
      >
        <TrajectoryBackground className="opacity-50" />

        <div className="max-w-6xl mx-auto relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Copy */}
            <div className="product-text">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-neon-700 uppercase tracking-wider mb-4">
                <MiniMatchMotif className="w-12 h-8" />
                Le concept
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-dark-800 mb-6 leading-tight">
                Le premier <span className="text-pink-500">matching</span> pour coureurs.
              </h2>
              <p className="text-lg text-dark-500 mb-8 leading-relaxed">
                On te propose des sorties adaptées à ton <span className="text-neon-700 font-semibold">rythme</span> — et des gens qui courent comme toi.
                Plus de sessions où tu es largué, ou où tu attends les autres.
              </p>

              <div className="flex flex-col gap-4">
                {[
                  'Algo de matching par allure et disponibilités',
                  'Sessions près de chez toi, créées par la communauté',
                  'Synchronisation Strava pour un matching précis',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-neon-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-neon-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-dark-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - UI Screenshots mockup */}
            <div className="relative product-screenshot">
              {/* Main screenshot card */}
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-dark-800/10 p-2 border border-silver-200">
                <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 aspect-[4/3] flex flex-col">
                  {/* Fake dashboard header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white font-bold">
                      T
                    </div>
                    <div>
                      <div className="text-white font-semibold">Ton prochain run</div>
                      <div className="text-silver-500 text-sm">3 matchs compatibles</div>
                    </div>
                  </div>

                  {/* Fake session card */}
                  <div className="bg-dark-700/50 rounded-xl p-4 mb-4 border border-dark-600">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 bg-neon-500/20 text-neon-400 text-xs font-semibold rounded-full">
                        98% compatible
                      </span>
                      <span className="text-silver-500 text-sm">Demain 19h</span>
                    </div>
                    <div className="text-white font-bold mb-1">Sortie tempo Bois de Vincennes</div>
                    <div className="text-silver-400 text-sm">5'30/km • 10 km • 4 coureurs</div>
                  </div>

                  {/* Fake avatars */}
                  <div className="flex items-center gap-2 mt-auto">
                    <div className="flex -space-x-2">
                      {['from-pink-400 to-purple-500', 'from-neon-400 to-teal-500', 'from-orange-400 to-red-500'].map((g, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-dark-800 flex items-center justify-center text-[10px] font-bold text-white`}>
                          {String.fromCharCode(77 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-silver-400 text-sm">+4 inscrits</span>
                  </div>
                </div>
              </div>

              {/* Floating matching badge */}
              <div className="absolute -top-4 -right-4 bg-pink-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-pink-500/30 animate-gentle-float">
                Match trouvé !
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 4 — COMMENT ÇA MARCHE (~110vh) */}
      {/* ============================================ */}
      <section
        id="how-it-works"
        ref={setRef('how-it-works')}
        className={`px-4 sm:px-6 lg:px-8 bg-white relative flex flex-col items-center justify-center section-reveal ${isVisible['how-it-works'] ? 'visible' : ''}`}
        style={{ minHeight: '110vh', paddingTop: '8rem', paddingBottom: '8rem' }}
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-neon-700 uppercase tracking-wider mb-4">
              Simple comme 1-2-3
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-dark-800 mb-4">
              Comment ça <span className="text-pink-500">matche</span> ?
            </h2>
            <p className="text-lg text-dark-500 max-w-2xl mx-auto">
              Trois étapes pour trouver tes partenaires de course idéaux.
            </p>
          </div>

          {/* Steps */}
          <div className={`grid md:grid-cols-3 gap-8 stagger-children ${isVisible['how-it-works'] ? 'visible' : ''}`}>
            {/* Step 1 */}
            <div className="relative text-center group">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-neon-50 flex items-center justify-center group-hover:bg-neon-100 transition-colors">
                  <svg className="w-12 h-12 text-neon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -bottom-3 -right-3 w-10 h-7 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-2">Étape 1</div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">Dis-nous ton rythme</h3>
              <p className="text-dark-500">
                Renseigne ton allure moyenne et connecte Strava pour un matching ultra-précis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center group">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                  <svg className="w-12 h-12 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -bottom-3 -right-3 w-10 h-7 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-2">Étape 2</div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">Découvre tes <span className="text-pink-500">matchs</span></h3>
              <p className="text-dark-500">
                On te propose des sessions et des coureurs compatibles avec ton niveau.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center group">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-neon-50 flex items-center justify-center group-hover:bg-neon-100 transition-colors">
                  <svg className="w-12 h-12 text-neon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -bottom-3 -right-3 w-10 h-7 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-2">Étape 3</div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">Cours <span className="text-neon-600">ensemble</span></h3>
              <p className="text-dark-500">
                Rejoins la session, rencontre ton groupe, et partage le plaisir de courir.
              </p>
            </div>
          </div>

          {/* Animated matching visualization */}
          <div className="hidden md:block">
            <HowItWorksMatchSVG isVisible={isVisible['how-it-works']} />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 5 — 3 PILIERS / BÉNÉFICES (~100vh) */}
      {/* ============================================ */}
      <section
        id="benefits"
        ref={setRef('benefits')}
        className={`px-4 sm:px-6 lg:px-8 bg-silver-50 relative flex items-center ${isVisible['benefits'] ? 'benefits-visible' : ''}`}
        style={{ minHeight: '100vh', paddingTop: '8rem', paddingBottom: '8rem' }}
      >
        <TrajectoryBackground className="opacity-30" />

        <div className="max-w-5xl mx-auto relative z-10 w-full">
          <div
            className={`text-center mb-16 transition-all duration-700 ${isVisible['benefits'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-4xl md:text-5xl font-black text-dark-800 mb-4">
              Pourquoi <span className="text-pink-500">PaceMate</span> ?
            </h2>
            <p className="text-lg text-dark-500 max-w-2xl mx-auto">
              Tout ce qu'il te faut pour courir mieux, ensemble.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilier 1 */}
            <div className="benefit-card bg-white rounded-2xl p-8 border border-silver-200 hover:shadow-xl hover:border-neon-200 transition-all group">
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-400 to-teal-500 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -top-2 -right-2 w-8 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">
                Compatibilité de <span className="text-neon-600">rythme</span>
              </h3>
              <p className="text-dark-500">
                Fini les runs où tu es à la traîne ou tu attends les autres. Notre algo te connecte avec des coureurs à ton allure.
              </p>
            </div>

            {/* Pilier 2 */}
            <div className="benefit-card bg-white rounded-2xl p-8 border border-silver-200 hover:shadow-xl hover:border-pink-200 transition-all group">
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -top-2 -right-2 w-8 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">
                Runs <span className="text-pink-500">près de toi</span>
              </h3>
              <p className="text-dark-500">
                Découvre des sessions dans ton quartier, créées par des coureurs locaux. Plus d'excuse pour ne pas sortir.
              </p>
            </div>

            {/* Pilier 3 */}
            <div className="benefit-card bg-white rounded-2xl p-8 border border-silver-200 hover:shadow-xl hover:border-neon-200 transition-all group">
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <MiniMatchMotif className="absolute -top-2 -right-2 w-8 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-3">
                Motivation du <span className="text-orange-500">groupe</span>
              </h3>
              <p className="text-dark-500">
                Courir seul c'est dur. Avec un groupe qui te ressemble, chaque sortie devient un moment attendu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 6 — COMMUNITY / TESTIMONIALS (~100vh) */}
      {/* ============================================ */}
      <section
        id="community"
        ref={(el) => {
          setRef('community')(el);
          testimonialsRef.current = el;
        }}
        className={`px-4 sm:px-6 lg:px-8 bg-white relative flex items-center section-reveal ${isVisible['community'] ? 'visible' : ''}`}
        style={{ minHeight: '100vh', paddingTop: '8rem', paddingBottom: '8rem' }}
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-pink-600 uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              Ils courent avec PaceMate
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-dark-800 mb-4">
              La communauté parle
            </h2>
          </div>

          {/* Testimonials grid with horizontal parallax */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="bg-silver-50 rounded-2xl p-6 border border-silver-200 hover:shadow-lg transition-all duration-300"
                style={{
                  transform: `translateX(${i === 1 ? 0 : (i === 0 ? -testimonialOffset : testimonialOffset) * 0.5}px)`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.avatar} flex items-center justify-center text-white font-bold`}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-dark-800">{testimonial.name}</div>
                    <div className="text-sm text-dark-500">{testimonial.city}</div>
                  </div>
                </div>
                <p className="text-dark-600 leading-relaxed">"{testimonial.text}"</p>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="bg-gradient-to-r from-dark-800 to-dark-900 rounded-2xl p-8 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-white">{stats.runners.toLocaleString()}</div>
              <div className="text-silver-400 text-sm mt-1">coureurs actifs</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-dark-600" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-pink-400">{stats.matchesThisWeek}</div>
              <div className="text-silver-400 text-sm mt-1">matchs cette semaine</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-dark-600" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-neon-400">{stats.sessions.toLocaleString()}</div>
              <div className="text-silver-400 text-sm mt-1">sorties créées</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 7 — FINAL CTA / CLIMAX (~110vh) */}
      {/* ============================================ */}
      <section
        id="final-cta"
        ref={setRef('final-cta')}
        className={`px-4 sm:px-6 lg:px-8 bg-dark-800 relative overflow-hidden flex items-center justify-center ${isVisible['final-cta'] ? 'cta-visible' : ''}`}
        style={{ minHeight: '110vh' }}
      >
        {/* Large matching motif background - animated on reveal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`transition-all duration-1000 ${isVisible['final-cta'] ? 'opacity-25 scale-100' : 'opacity-0 scale-75'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <MatchingMotif
              className="w-[600px] md:w-[900px] h-auto"
              animated={isVisible['final-cta']}
              scale={1.5}
              glowIntensity="normal"
              delayedStart={true}
            />
          </div>
        </div>

        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-neon-500/10 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Match point pulse */}
          <div
            className={`inline-flex items-center justify-center mb-8 transition-all duration-500 ${isVisible['final-cta'] ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
            style={{ transitionDelay: '0.3s' }}
          >
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-pink-500 animate-match-pulse" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-pink-500/50 animate-ping" />
            </div>
          </div>

          <h2
            className={`text-4xl md:text-6xl font-black text-white mb-6 leading-tight transition-all duration-700 ${isVisible['final-cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '0.4s' }}
          >
            Ton prochain run<br />
            <span className="text-pink-500">t'attend déjà</span>.
          </h2>
          <p
            className={`text-xl text-silver-300 mb-10 max-w-xl mx-auto transition-all duration-700 ${isVisible['final-cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '0.5s' }}
          >
            Rejoins la communauté PaceMate et trouve ton <span className="text-neon-400">pace</span>. Trouve ton <span className="text-pink-400">mate</span>.
          </p>

          <div className="cta-climax">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-3 px-10 py-5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xl rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/25"
            >
              Créer mon compte
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <p
            className={`text-silver-500 text-sm mt-6 transition-all duration-700 ${isVisible['final-cta'] ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '0.8s' }}
          >
            Gratuit. Sans engagement. Prêt en 30 secondes.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-dark-900 border-t border-dark-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/PaceMateLogo_vert.svg"
                alt="PaceMate Logo"
                width={32}
                height={32}
              />
              <span className="text-xl font-bold text-white">
                PaceMate
              </span>
            </div>

            <div className="flex gap-8 text-sm text-silver-400">
              <Link href="#" className="hover:text-white transition-colors hover-trajectory">
                À propos
              </Link>
              <Link href="#" className="hover:text-white transition-colors hover-trajectory">
                Contact
              </Link>
              <Link href="#" className="hover:text-white transition-colors hover-trajectory">
                Confidentialité
              </Link>
              <Link href="#" className="hover:text-white transition-colors hover-trajectory">
                CGU
              </Link>
            </div>

            <div className="text-sm text-silver-500">
              © 2026 PaceMate. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

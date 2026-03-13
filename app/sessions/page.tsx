'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getDiscoverySessions, type DiscoverySession } from '@/lib/actions';
import SessionPanel from '@/components/overlays/SessionPanel';
import CreateWizardModal from '@/components/overlays/CreateWizardModal';
import DiscoveryCard from '@/components/ui/DiscoveryCard';
import dynamic from 'next/dynamic';
import {
  Navigation, Plus, Compass, TrendingUp, Clock, Users, Flame,
  Map, LayoutList, BarChart2, Filter, X, ChevronDown, ChevronRight,
  Footprints, Shield, Star,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Load map only on client side (uses CDN Leaflet)
const MapView = dynamic(() => import('@/components/ui/MapView'), { ssr: false });

// ─── Filter types ─────────────────────────────────────────────────────────────

type ViewMode = 'recommended' | 'map' | 'popular';
type FilterDist  = 'any' | '5' | '10' | '25';
type FilterPace  = 'any' | 'fast' | 'medium' | 'easy' | 'slow';
type FilterGroup = 'any' | 'solo' | 'small' | 'medium';
type FilterDay   = 'any' | 'today' | 'tomorrow' | 'week';

interface Filters {
  dist:      FilterDist;
  pace:      FilterPace;
  group:     FilterGroup;
  day:       FilterDay;
  teamOnly:  boolean;
}

const DEFAULT_FILTERS: Filters = {
  dist: 'any', pace: 'any', group: 'any', day: 'any', teamOnly: false,
};

// ─── Pace helpers ─────────────────────────────────────────────────────────────

const PACE_RANGES: Record<FilterPace, [number, number]> = {
  any:    [0, Infinity],
  fast:   [0,   300],       // < 5:00/km
  medium: [300, 360],       // 5:00–6:00
  easy:   [360, 420],       // 6:00–7:00
  slow:   [420, Infinity],  // > 7:00
};

function parsePaceSec(pace: string): number {
  const [m, s] = pace.split(':');
  return parseInt(m) * 60 + parseInt(s || '0');
}

// ─── Section definition ───────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  sessions: DiscoverySession[];
}

// ─── Chip component ───────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? 'bg-neon-500 text-dark-800'
          : 'bg-white/8 text-dark-200 border border-white/10 hover:bg-white/12'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Section scroll row ───────────────────────────────────────────────────────

function SectionRow({ section, onSessionClick }: { section: Section; onSessionClick: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${section.accentColor}`}>{section.icon}</span>
          <h2 className="text-white font-bold text-base">{section.title}</h2>
          <span className="text-dark-300 text-xs font-medium">{section.sessions.length}</span>
        </div>
        {section.sessions.length > 3 && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="text-neon-400 text-xs font-semibold flex items-center gap-1 hover:text-neon-300 transition-colors"
          >
            Voir plus <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {section.sessions.map((s) => (
          <div key={s.id} style={{ scrollSnapAlign: 'start' }}>
            <DiscoveryCard session={s} onClick={() => onSessionClick(s.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { profile } = useAuth();
  const [allSessions, setAllSessions] = useState<DiscoverySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('recommended');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'profile' | 'gps' | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ── Overlay helpers ────────────────────────────────────────────────────────

  const openSession = useCallback((id: string) => {
    setSelectedSessionId(id);
    setIsPanelOpen(true);
    window.history.pushState({}, '', `/sessions?session=${id}`);
  }, []);

  const closeSession = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedSessionId(null);
    window.history.pushState({}, '', '/sessions');
  }, []);

  const openCreate = useCallback(() => {
    setIsCreateModalOpen(true);
    window.history.pushState({}, '', '/sessions?create=true');
  }, []);

  const closeCreate = useCallback(() => {
    setIsCreateModalOpen(false);
    window.history.pushState({}, '', '/sessions');
  }, []);

  // ── Location detection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (profile?.home_latitude && profile?.home_longitude) {
      setUserLocation({ lat: profile.home_latitude, lng: profile.home_longitude });
      setLocationSource('profile');
    }
  }, [profile]);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationSource('gps');
      },
      () => { /* silently fail */ },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    getDiscoverySessions(
      userLocation ? { userLat: userLocation.lat, userLng: userLocation.lng } : undefined,
    ).then((data) => {
      setAllSessions(data);
      setLoading(false);
    });
  }, [userLocation]);

  // ── Client-side filtering ──────────────────────────────────────────────────

  const filtered = useMemo<DiscoverySession[]>(() => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayEnd);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 3_600_000);

    return allSessions.filter((s) => {
      // Distance filter (needs userLocation)
      if (filters.dist !== 'any') {
        const km = parseInt(filters.dist);
        if (s.distance_from_user == null || s.distance_from_user > km) return false;
      }

      // Pace filter
      if (filters.pace !== 'any' && s.target_pace) {
        const sec = parsePaceSec(s.target_pace);
        const [lo, hi] = PACE_RANGES[filters.pace];
        if (sec < lo || sec >= hi) return false;
      }

      // Group size
      if (filters.group !== 'any') {
        const c = s.participants_count ?? 0;
        if (filters.group === 'solo'   && c > 1)  return false;
        if (filters.group === 'small'  && (c < 2 || c > 4)) return false;
        if (filters.group === 'medium' && c < 5)  return false;
      }

      // Day filter
      if (filters.day !== 'any') {
        const st = new Date(s.start_time);
        if (filters.day === 'today'    && st > todayEnd)                   return false;
        if (filters.day === 'tomorrow' && (st < tomorrowStart || st > tomorrowEnd)) return false;
        if (filters.day === 'week'     && st > weekEnd)                    return false;
      }

      // Team only
      if (filters.teamOnly && !s.isTeamRun) return false;

      return true;
    });
  }, [allSessions, filters]);

  // ── Sections ───────────────────────────────────────────────────────────────

  const sections = useMemo<Section[]>(() => {
    const popular = [...filtered].sort(
      (a, b) => (b.participants_count ?? 0) - (a.participants_count ?? 0),
    );
    const startingSoon = filtered.filter((s) => s.isStartingSoon).slice(0, 8);
    const fillingUp    = filtered.filter((s) => s.isFillingUp && !s.isStartingSoon).slice(0, 8);
    const coRunners    = filtered.filter((s) => s.hasCoRunner).slice(0, 8);
    const teamRuns     = filtered.filter((s) => s.isTeamRun).slice(0, 8);
    const recommended  = filtered.slice(0, 10);

    const result: Section[] = [
      {
        id: 'recommended',
        title: 'Pour toi',
        icon: <Star className="w-3.5 h-3.5 text-yellow-400" />,
        accentColor: 'bg-yellow-500/15',
        sessions: recommended,
      },
    ];

    if (startingSoon.length > 0) result.push({
      id: 'soon',
      title: 'Commence bientôt',
      icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
      accentColor: 'bg-orange-500/15',
      sessions: startingSoon,
    });

    if (fillingUp.length > 0) result.push({
      id: 'filling',
      title: 'Se remplit vite',
      icon: <TrendingUp className="w-3.5 h-3.5 text-pink-400" />,
      accentColor: 'bg-pink-500/15',
      sessions: fillingUp,
    });

    if (coRunners.length > 0) result.push({
      id: 'co-runners',
      title: 'Tes compagnons de route',
      icon: <Users className="w-3.5 h-3.5 text-neon-400" />,
      accentColor: 'bg-neon-500/10',
      sessions: coRunners,
    });

    if (teamRuns.length > 0) result.push({
      id: 'team',
      title: 'Sorties d\'équipe',
      icon: <Shield className="w-3.5 h-3.5 text-purple-400" />,
      accentColor: 'bg-purple-500/15',
      sessions: teamRuns,
    });

    // Popular (separate from above — used for "popular" tab)
    result.push({
      id: 'popular',
      title: 'Les plus rejointes',
      icon: <BarChart2 className="w-3.5 h-3.5 text-blue-400" />,
      accentColor: 'bg-blue-500/15',
      sessions: popular,
    });

    return result;
  }, [filtered]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.dist !== 'any')     n++;
    if (filters.pace !== 'any')     n++;
    if (filters.group !== 'any')    n++;
    if (filters.day !== 'any')      n++;
    if (filters.teamOnly)           n++;
    return n;
  }, [filters]);

  const updateFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // ── View tabs config ───────────────────────────────────────────────────────

  const tabs: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'recommended', icon: <Compass className="w-4 h-4" />, label: 'Recommandés' },
    { mode: 'map',         icon: <Map className="w-4 h-4" />,     label: 'Carte'       },
    { mode: 'popular',     icon: <BarChart2 className="w-4 h-4" />, label: 'Populaires' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-16">
      {/* Scrollbar-hide style */}
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-48 bg-neon-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                <Footprints className="w-4 h-4" />
                Découvrir
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Trouve ton prochain run
              </h1>
              <p className="text-dark-300 mt-1 text-sm">
                {filtered.length > 0
                  ? `${filtered.length} sortie${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''}`
                  : 'Sois le premier à organiser une sortie !'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Location badge */}
              {!locationSource ? (
                <button
                  onClick={requestGPS}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/10 rounded-xl text-sm text-dark-200 hover:bg-white/12 transition-colors"
                >
                  <Navigation className="w-4 h-4 text-neon-400" />
                  Activer ma position
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-500/10 border border-neon-500/30 rounded-xl text-sm text-neon-400 font-medium">
                  <Navigation className="w-4 h-4" />
                  {locationSource === 'profile'
                    ? (profile?.home_city ?? 'Profil')
                    : 'Position GPS'}
                </div>
              )}

              {/* Create run CTA */}
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-pink-500/25"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Créer une sortie</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY TAB + FILTER BAR ──────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-dark-900/95 backdrop-blur-sm border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            {/* View mode tabs */}
            <div className="flex items-center bg-white/6 border border-white/10 rounded-xl p-1 gap-1 shrink-0">
              {tabs.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === mode
                      ? 'bg-neon-500 text-dark-800 shadow-sm'
                      : 'text-dark-300 hover:text-white'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-white/10 shrink-0" />

            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-neon-500/10 border-neon-500/40 text-neon-400'
                  : 'bg-white/6 border-white/10 text-dark-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-500 rounded-full text-[9px] font-bold text-dark-800 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Active filter chips (quick-remove) */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {filters.dist !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/8 rounded-full text-[11px] text-white font-medium shrink-0">
                    ≤{filters.dist} km
                    <button onClick={() => updateFilter('dist', 'any')}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filters.pace !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/8 rounded-full text-[11px] text-white font-medium shrink-0">
                    Allure: {filters.pace}
                    <button onClick={() => updateFilter('pace', 'any')}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filters.group !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/8 rounded-full text-[11px] text-white font-medium shrink-0">
                    Groupe: {filters.group}
                    <button onClick={() => updateFilter('group', 'any')}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filters.day !== 'any' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/8 rounded-full text-[11px] text-white font-medium shrink-0">
                    {filters.day === 'today' ? "Auj." : filters.day === 'tomorrow' ? 'Dem.' : 'Cette sem.'}
                    <button onClick={() => updateFilter('day', 'any')}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filters.teamOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/8 rounded-full text-[11px] text-white font-medium shrink-0">
                    Équipe
                    <button onClick={() => updateFilter('teamOnly', false)}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-dark-400 hover:text-white underline underline-offset-2 shrink-0 ml-1"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTER PANEL ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-dark-800/90 border-b border-white/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
            {/* Distance */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-dark-300 font-semibold uppercase tracking-wide w-16 shrink-0">Distance</span>
              <div className="flex flex-wrap gap-1.5">
                {(['any', '5', '10', '25'] as FilterDist[]).map((v) => (
                  <Chip key={v} active={filters.dist === v} onClick={() => updateFilter('dist', v)}>
                    {v === 'any' ? 'Toutes' : `≤ ${v} km`}
                  </Chip>
                ))}
                {!locationSource && filters.dist !== 'any' && (
                  <span className="text-[10px] text-orange-400 italic flex items-center">Activez votre position</span>
                )}
              </div>
            </div>

            {/* Pace */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-dark-300 font-semibold uppercase tracking-wide w-16 shrink-0">Allure</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={filters.pace === 'any'}    onClick={() => updateFilter('pace', 'any')}>Toutes</Chip>
                <Chip active={filters.pace === 'fast'}   onClick={() => updateFilter('pace', 'fast')}>&lt; 5:00/km</Chip>
                <Chip active={filters.pace === 'medium'} onClick={() => updateFilter('pace', 'medium')}>5:00–6:00</Chip>
                <Chip active={filters.pace === 'easy'}   onClick={() => updateFilter('pace', 'easy')}>6:00–7:00</Chip>
                <Chip active={filters.pace === 'slow'}   onClick={() => updateFilter('pace', 'slow')}>&gt; 7:00/km</Chip>
              </div>
            </div>

            {/* Group size */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-dark-300 font-semibold uppercase tracking-wide w-16 shrink-0">Groupe</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={filters.group === 'any'}    onClick={() => updateFilter('group', 'any')}>Tous</Chip>
                <Chip active={filters.group === 'solo'}   onClick={() => updateFilter('group', 'solo')}>Solo</Chip>
                <Chip active={filters.group === 'small'}  onClick={() => updateFilter('group', 'small')}>2–4 runners</Chip>
                <Chip active={filters.group === 'medium'} onClick={() => updateFilter('group', 'medium')}>5+ runners</Chip>
              </div>
            </div>

            {/* Day */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-dark-300 font-semibold uppercase tracking-wide w-16 shrink-0">Jour</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={filters.day === 'any'}       onClick={() => updateFilter('day', 'any')}>Tous</Chip>
                <Chip active={filters.day === 'today'}     onClick={() => updateFilter('day', 'today')}>Aujourd'hui</Chip>
                <Chip active={filters.day === 'tomorrow'}  onClick={() => updateFilter('day', 'tomorrow')}>Demain</Chip>
                <Chip active={filters.day === 'week'}      onClick={() => updateFilter('day', 'week')}>Cette semaine</Chip>
              </div>
            </div>

            {/* Team only toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-dark-300 font-semibold uppercase tracking-wide w-16 shrink-0">Équipe</span>
              <button
                onClick={() => updateFilter('teamOnly', !filters.teamOnly)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filters.teamOnly
                    ? 'bg-neon-500 text-dark-800'
                    : 'bg-white/8 text-dark-200 border border-white/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Sorties d'équipe uniquement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          /* ── EMPTY STATE ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">
              <Footprints className="w-10 h-10 text-dark-300" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Aucune sortie trouvée</h2>
              <p className="text-dark-300 text-sm max-w-sm mx-auto">
                {activeFilterCount > 0
                  ? 'Essaie de réduire tes filtres ou crée toi-même une sortie.'
                  : 'Sois le premier à organiser une sortie dans ta zone !'}
              </p>
            </div>
            <div className="flex gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 bg-white/8 border border-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/12 transition-colors"
                >
                  Effacer les filtres
                </button>
              )}
              <button
                onClick={openCreate}
                className="px-5 py-2.5 bg-neon-500 text-dark-800 text-sm font-bold rounded-xl hover:bg-neon-400 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer une sortie
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── RECOMMENDED MODE ───────────────────────────────────────── */}
            {viewMode === 'recommended' && (
              <div className="space-y-10">
                {sections
                  .filter((s) => s.id !== 'popular' && s.sessions.length > 0)
                  .map((section) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      onSessionClick={openSession}
                    />
                  ))}
              </div>
            )}

            {/* ── MAP MODE ───────────────────────────────────────────────── */}
            {viewMode === 'map' && (
              <div className="space-y-6">
                <MapView
                  sessions={filtered}
                  onSessionClick={openSession}
                  userLocation={userLocation}
                />
                {/* Compact list below map */}
                <div className="space-y-3">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <LayoutList className="w-4 h-4 text-neon-400" />
                    Toutes les sorties ({filtered.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.slice(0, 12).map((s) => (
                      <DiscoveryCard key={s.id} session={s} onClick={() => openSession(s.id)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── POPULAR MODE ───────────────────────────────────────────── */}
            {viewMode === 'popular' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-white font-bold text-lg">Les plus rejointes</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sections
                    .find((s) => s.id === 'popular')
                    ?.sessions.map((s) => (
                      <DiscoveryCard key={s.id} session={s} onClick={() => openSession(s.id)} />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── SESSION PANEL ─────────────────────────────────────────────────── */}
      <SessionPanel
        sessionId={selectedSessionId}
        isOpen={isPanelOpen}
        onClose={closeSession}
      />

      {/* ── CREATE MODAL ──────────────────────────────────────────────────── */}
      <CreateWizardModal isOpen={isCreateModalOpen} onClose={closeCreate} />

      {/* ── FAB (mobile) ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <button
          onClick={openCreate}
          className="w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/30 transition-all active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

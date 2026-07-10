'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  History,
  Pencil,
  FilePlus,
  Flame,
  ImagePlus,
  Gauge,
  HeartPulse,
  Home,
  LogIn,
  LogOut,
  LayoutDashboard,
  LineChart,
  ListFilter,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Upload,
  UserRound,
  UsersRound,
  Eye,
  X,
} from 'lucide-react';
import {
  athletes as initialAthletes,
  defaultSettings,
  emptyAssessment,
  formatDate,
  generateCode,
  type Assessment,
  type Athlete,
  type ProductSettings,
  type RadarMetric,
  type ViewId,
} from '@/lib/mock-product';
import type { Level } from '@/styles/tokens';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/premium';
import * as api from '@/lib/actions';
import { uploadAthletePhoto } from '@/lib/upload';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type { AssessmentDraftInput } from '@/lib/form-types';
import type { CatalogKind, FichaTheme } from '@/lib/ficha';

const viewItems: Array<{ id: ViewId; label: string; icon: typeof UsersRound }> = [
  { id: 'dashboard', label: 'Panel', icon: Home },
  { id: 'athletes', label: 'Deportistas', icon: UsersRound },
  { id: 'assessment', label: 'Valoracion', icon: ClipboardList },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const levelBorder: Record<Level, string> = {
  danger: 'border-t-level-danger',
  warning: 'border-t-level-warning',
  good: 'border-t-level-good',
  elite: 'border-t-level-elite',
};

const levelDot: Record<Level, string> = {
  danger: 'bg-level-danger',
  warning: 'bg-level-warning',
  good: 'bg-level-good',
  elite: 'bg-level-elite',
};

const metricSeries = {
  fat: [12, 12.4, 12.1, 12.8, 12.2, 12.4],
  heart: [58, 56, 57, 55, 54, 54],
  jump: [35, 36, 36, 37, 40, 42],
  sprint: [4.62, 4.56, 4.52, 4.48, 4.42, 4.38],
} as const;

const demoBodyProfile: Record<string, { weight: number; height: number; notes: string }> = {
  daniel: { weight: 57.4, height: 162, notes: 'Reporte demo con indicadores dentro de rango y foco en velocidad/fuerza.' },
  samuel: { weight: 54.8, height: 160, notes: 'Seguimiento recomendado en FC reposo y salto para ajustar carga.' },
  maria: { weight: 50.3, height: 158, notes: 'Perfil estable con buena movilidad y resistencia destacada.' },
  juan: { weight: 61.8, height: 170, notes: 'Perfil atleta con alto rendimiento en velocidad y salto.' },
};
const defaultAthletePhoto = '/images/default-athlete.svg';

type AssessmentDraft = AssessmentDraftInput;
type SprintDistance = '10' | '20' | '30';

const PULL_THRESHOLD = 82;
const PULL_MAX = 112;
const sprintDistances: Array<{ value: SprintDistance; label: string; key: keyof AssessmentDraft; placeholder: string }> = [
  { value: '10', label: '10 m', key: 'speed10m', placeholder: 'Ej. 1.90' },
  { value: '20', label: '20 m', key: 'speed20m', placeholder: 'Ej. 3.20' },
  { value: '30', label: '30 m', key: 'speed30m', placeholder: 'Ej. 4.50' },
];

const toNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalize = (value: number | null, min: number, max: number) =>
  value == null ? 0 : clampScore(((value - min) / (max - min)) * 100);
const normalizeSpeed = (seconds: number | null) =>
  seconds == null || seconds <= 0 ? 0 : clampScore(((2.4 - seconds) / (2.4 - 1.5)) * 100);
const kmhFromSprint = (meters: number, seconds: number | null) =>
  seconds == null || seconds <= 0 ? null : (meters / seconds) * 3.6;
const calcPct1rm = (loadKg: string, oneRmKg: string) => {
  const load = toNumber(loadKg);
  const oneRm = toNumber(oneRmKg);
  if (load == null || oneRm == null || oneRm <= 0) return '';
  return ((load / oneRm) * 100).toFixed(1);
};
const yearsBetween = (fromDate: string, toDate: string) => {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const years = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years >= 0 ? years : null;
};
const chronologicalAge = (birthDate: string, assessmentDate: string) => {
  const years = yearsBetween(birthDate, assessmentDate);
  return years == null ? null : Math.floor(years);
};
const biologicalAge = (
  sex: Athlete['sex'],
  birthDate: string,
  assessmentDate: string,
  heightCm: number | null,
  sittingHeightCm: number | null,
  weightKg: number | null,
) => {
  const ageDecimal = yearsBetween(birthDate, assessmentDate);
  if (
    ageDecimal == null ||
    heightCm == null ||
    sittingHeightCm == null ||
    weightKg == null ||
    heightCm <= 0 ||
    sittingHeightCm <= 0 ||
    weightKg <= 0 ||
    sittingHeightCm >= heightCm
  ) return null;

  const legLengthCm = heightCm - sittingHeightCm;
  const weightHeightRatio = (weightKg / heightCm) * 100;
  const maturityOffset = sex === 'M'
    ? -9.236 +
      0.0002708 * (legLengthCm * sittingHeightCm) -
      0.001663 * (ageDecimal * legLengthCm) +
      0.007216 * (ageDecimal * sittingHeightCm) +
      0.02292 * weightHeightRatio
    : -9.376 +
      0.0001882 * (legLengthCm * sittingHeightCm) +
      0.0022 * (ageDecimal * legLengthCm) +
      0.005841 * (ageDecimal * sittingHeightCm) -
      0.002658 * (ageDecimal * weightKg) +
      0.07693 * weightHeightRatio;

  return ageDecimal - maturityOffset;
};

const classifyFat = (sex: Athlete['sex'], value: number | null) => {
  if (value == null) return { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };
  if (sex === 'M') {
    if (value <= 13) return { level: 'good' as Level, label: 'Optimo', range: '6-13 %' };
    if (value <= 17) return { level: 'good' as Level, label: 'Optimo', range: '14-17 %' };
    if (value <= 24) return { level: 'warning' as Level, label: 'Medio', range: '18-24 %' };
    return { level: 'danger' as Level, label: 'Bajo', range: '>= 25 %' };
  }
  if (value <= 20) return { level: 'good' as Level, label: 'Optimo', range: '14-20 %' };
  if (value <= 24) return { level: 'good' as Level, label: 'Optimo', range: '21-24 %' };
  if (value <= 31) return { level: 'warning' as Level, label: 'Medio', range: '25-31 %' };
  return { level: 'danger' as Level, label: 'Bajo', range: '>= 32 %' };
};

const classifyRestingHr = (value: number | null) => {
  if (value == null) return { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };
  if (value < 50) return { level: 'elite' as Level, label: 'Atleta', range: '< 50 ppm' };
  if (value <= 59) return { level: 'good' as Level, label: 'Optimo', range: '50-59 ppm' };
  if (value <= 80) return { level: 'warning' as Level, label: 'Medio', range: '60-80 ppm' };
  return { level: 'danger' as Level, label: 'Bajo', range: '> 80 ppm' };
};

const classifySitReach = (sex: Athlete['sex'], value: number | null) => {
  if (value == null) return { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };
  const limits = sex === 'M' ? [20, 27, 35] : [23, 30, 38];
  if (value < limits[0]) return { level: 'danger' as Level, label: 'Bajo', range: `< ${limits[0]} cm` };
  if (value <= limits[1]) return { level: 'warning' as Level, label: 'Medio', range: `${limits[0]}-${limits[1]} cm` };
  if (value <= limits[2]) return { level: 'good' as Level, label: 'Optimo', range: `${limits[1]}-${limits[2]} cm` };
  return { level: 'elite' as Level, label: 'Atleta', range: `> ${limits[2]} cm` };
};

const classifyCmj = (value: number | null) => {
  if (value == null) return { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };
  if (value >= 44) return { level: 'elite' as Level, label: 'Atleta', range: '>= 44 cm' };
  if (value >= 38) return { level: 'good' as Level, label: 'Optimo', range: '38-46 cm' };
  if (value >= 32) return { level: 'warning' as Level, label: 'Medio', range: '32-38 cm' };
  return { level: 'danger' as Level, label: 'Bajo', range: '< 32 cm' };
};

export default function MockMvpApp() {
  const router = useRouter();
  const [view, setView] = useState<ViewId>('athletes');
  const [mockAthletes, setMockAthletes] = useState<Athlete[]>([]);
  const [settings, setSettings] = useState<ProductSettings>(defaultSettings);
  const [selectedId, setSelectedId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdmin] = useState(true); // sesión ya validada por el middleware
  const [publicPreview, setPublicPreview] = useState(false);
  const [publicAssessment, setPublicAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formAssessment, setFormAssessment] = useState<Assessment | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [fichaTheme, setFichaThemeState] = useState<FichaTheme>('light');

  useEffect(() => {
    let active = true;
    api
      .getInitialData()
      .then((data) => {
        if (!active) return;
        setMockAthletes(data.athletes);
        setSettings(data.settings);
        setFichaThemeState(data.fichaTheme);
        setSelectedId((current) => current || data.athletes[0]?.id || '');
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const selected = mockAthletes.find((athlete) => athlete.id === selectedId) ?? mockAthletes[0];
  const currentAssessment = selected?.assessments[0];
  const isPublicView = !isAdmin || publicPreview;

  const filteredAthletes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return mockAthletes.filter((athlete) => {
      const matchesCategory = category === 'Todos' || athlete.category === category;
      const matchesQuery =
        normalized.length === 0 ||
        [athlete.name, athlete.code, athlete.document, athlete.category, athlete.group, athlete.sport]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, mockAthletes, query]);

  const categoryOptions = ['Todos', ...settings.categories];

  async function createAthlete(data: NewAthleteFormData) {
    try {
      let photoPath: string | null = null;
      if (data.photoFile) {
        photoPath = await uploadAthletePhoto(data.photoFile);
      }
      const athlete = await api.createAthlete({
        name: data.name,
        document: data.document,
        birthDate: data.birthDate,
        sex: data.sex,
        category: data.category,
        group: data.group,
        sport: data.sport,
        position: data.position,
        photoPath,
      });
      setMockAthletes((current) => [athlete, ...current]);
      setSelectedId(athlete.id);
      setPublicAssessment(null);
      setIsCreateOpen(false);
      setView('assessment');
      setPublicPreview(false);
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el deportista. Revisa la conexión e intenta de nuevo.');
    }
  }

  async function reload() {
    const data = await api.getInitialData();
    setMockAthletes(data.athletes);
    setSettings(data.settings);
    setFichaThemeState(data.fichaTheme);
    router.refresh();
  }

  async function changeFichaTheme(theme: FichaTheme) {
    setFichaThemeState(theme);
    await api.setFichaTheme(theme);
  }

  async function saveAssessmentDraft(athleteId: string, draft: AssessmentDraftInput, assessmentId?: string) {
    await api.saveAssessment(athleteId, draft, assessmentId);
    await reload();
  }

  async function updateAthleteInfo(athleteId: string, data: NewAthleteFormData) {
    try {
      let photoPath: string | null = null;
      if (data.photoFile) photoPath = await uploadAthletePhoto(data.photoFile);
      await api.updateAthlete(athleteId, {
        name: data.name,
        document: data.document,
        birthDate: data.birthDate,
        sex: data.sex,
        category: data.category,
        group: data.group,
        sport: data.sport,
        position: data.position,
        photoPath,
      });
      await reload();
      setEditOpen(false);
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar la información del deportista.');
    }
  }

  const detailAthlete = detailId ? mockAthletes.find((a) => a.id === detailId) ?? null : null;

  function openDetail(athlete: Athlete) {
    setSelectedId(athlete.id);
    setDetailId(athlete.id);
    setPublicPreview(false);
    setFormAssessment(null);
    setView('athletes');
  }
  function viewFicha(_athlete: Athlete, assessment: Assessment) {
    if (assessment.id) router.push(`/ficha/${assessment.id}`);
  }
  function startNewFicha(athlete: Athlete) {
    setSelectedId(athlete.id);
    setFormAssessment(null);
    setPublicPreview(false);
    setView('assessment');
  }
  function editFicha(athlete: Athlete, assessment: Assessment) {
    setSelectedId(athlete.id);
    setFormAssessment(assessment);
    setPublicPreview(false);
    setView('assessment');
  }

  function updateAthletePhoto(athleteId: string, photoUrl: string) {
    setMockAthletes((current) =>
      current.map((athlete) => (athlete.id === athleteId ? { ...athlete, photoUrl } : athlete)),
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm font-semibold text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4 text-center text-foreground">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="In Move" className="size-20 rounded-full object-cover ring-1 ring-border" />
          <p className="mt-4 text-2xl font-bold uppercase tracking-[-0.04em]">
            <span className="text-brand">IN</span>MOVE
          </p>
          <p className="mt-3 text-muted-foreground">Aún no hay deportistas registrados.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => setIsCreateOpen(true)}>
              <UserRound />
              Nuevo deportista
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut />
              Cerrar sesion
            </Button>
          </div>
        </div>
        {isCreateOpen ? (
          <CreateAthleteModal settings={settings} onClose={() => setIsCreateOpen(false)} onCreate={createAthlete} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_18%_0%,hsl(var(--brand)/0.10),transparent_28%),radial-gradient(circle_at_90%_12%,hsl(var(--level-elite)/0.08),transparent_26%),hsl(var(--background))] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col xl:flex-row">
        {isAdmin ? (
        <aside className="hidden w-[236px] shrink-0 border-r border-border bg-surface/80 px-4 py-5 xl:flex xl:flex-col print:hidden">
          <BrandBlock />
          <NavRail current={view} onChange={(nextView) => {
            setPublicPreview(false);
            setView(nextView);
          }} />
          <div className="mt-auto rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">MVP</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Vistas navegables con datos locales para aprobacion de producto.
            </p>
          </div>
        </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/92 px-4 py-3 backdrop-blur md:px-6 lg:px-8 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  In Move · Evaluacion y rendimiento
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold md:text-[26px]">
                  {isPublicView
                    ? 'Valoracion final'
                    : view === 'athletes'
                    ? 'Listado de deportistas'
                    : view === 'assessment'
                      ? 'Valoracion tablet-first'
                      : view === 'dashboard'
                        ? 'Dashboard operativo'
                        : 'Settings'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  level={isAdmin && !publicPreview ? 'elite' : selected.status}
                  label={isAdmin && !publicPreview ? 'Admin' : isAdmin ? 'Vista publica' : selected.statusLabel}
                />
                <Button size="sm" variant="outline" className="hidden sm:inline-flex">
                  <CalendarDays />
                  {formatDate(currentAssessment.date)}
                </Button>
                {isAdmin && publicPreview ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPublicPreview(false);
                      setView('assessment');
                    }}
                  >
                    Editar
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  <LogOut />
                  Cerrar sesion
                </Button>
              </div>
            </div>

            {isAdmin ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {viewItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPublicPreview(false);
                      setView(item.id);
                    }}
                    className={`flex h-11 shrink-0 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                      active
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-surface text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            ) : null}
          </header>

          <PullToRefresh onRefresh={reload}>
            <main className="flex-1 px-4 py-4 pb-[calc(var(--safe-bottom)+9rem)] md:px-6 md:py-6 md:pb-[calc(var(--safe-bottom)+9.5rem)] lg:px-8 xl:pb-8">
              {isPublicView ? (
                <div className="mx-auto grid max-w-6xl gap-4">
                  <div className="flex items-center justify-between gap-3 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => setPublicPreview(false)}>
                      <ChevronLeft />
                      Volver
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground">Vista previa (sin guardar)</span>
                  </div>
                  <PublicAssessmentView athlete={selected} assessmentOverride={publicAssessment} />
                </div>
              ) : view === 'athletes' ? (
                detailAthlete ? (
                  <AthleteDetailView
                    athlete={detailAthlete}
                    isAdmin={isAdmin}
                    onBack={() => setDetailId(null)}
                    onViewFicha={(assessment) => viewFicha(detailAthlete, assessment)}
                    onEditInfo={() => setEditOpen(true)}
                    onNewFicha={() => startNewFicha(detailAthlete)}
                    onEditFicha={(assessment) => editFicha(detailAthlete, assessment)}
                  />
                ) : (
                  <AthletesTable
                    athletes={filteredAthletes}
                    categoryOptions={categoryOptions}
                    query={query}
                    category={category}
                    onQuery={setQuery}
                    onCategory={setCategory}
                    onCreate={() => setIsCreateOpen(true)}
                    onOpen={openDetail}
                  />
                )
              ) : view === 'assessment' ? (
                <AssessmentView
                  key={(formAssessment?.id ?? 'new') + selected.id}
                  athlete={selected}
                  assessment={formAssessment ?? emptyAssessment()}
                  assessmentId={formAssessment?.id}
                  isAdmin={isAdmin}
                  onBack={() => setView('athletes')}
                  onSave={async (draft) => {
                    await saveAssessmentDraft(selected.id, draft, formAssessment?.id);
                    setView('athletes');
                  }}
                  onPhotoChange={(photoUrl) => updateAthletePhoto(selected.id, photoUrl)}
                  onPreviewPublic={(nextAssessment) => {
                    setPublicAssessment(nextAssessment);
                    setPublicPreview(true);
                  }}
                />
              ) : view === 'dashboard' ? (
                <DashboardView athletes={mockAthletes} />
              ) : view === 'settings' ? (
                <SettingsView
                  settings={settings}
                  onReload={reload}
                  fichaTheme={fichaTheme}
                  onFichaTheme={changeFichaTheme}
                  sampleFichaId={mockAthletes.find((a) => a.assessments.some((s) => s.id))?.assessments.find((s) => s.id)?.id}
                />
              ) : null}
            </main>
          </PullToRefresh>

          {isAdmin ? (
          <nav className="fixed inset-x-4 bottom-[calc(var(--safe-bottom)+1rem)] z-40 grid grid-cols-3 gap-2 rounded-[999px] border border-white/10 bg-surface/90 p-2 shadow-float backdrop-blur xl:hidden print:hidden">
            {viewItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPublicPreview(false);
                    setView(item.id);
                  }}
                  className={`flex h-12 items-center justify-center gap-2 rounded-[999px] text-xs font-bold transition sm:text-sm ${
                    active ? 'bg-brand text-brand-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="hidden min-[390px]:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          ) : null}
        </div>
      </div>

      {isCreateOpen ? (
        <CreateAthleteModal settings={settings} onClose={() => setIsCreateOpen(false)} onCreate={createAthlete} />
      ) : null}

      {editOpen && detailAthlete ? (
        <CreateAthleteModal
          settings={settings}
          initial={detailAthlete}
          title="Editar información"
          submitLabel="Guardar cambios"
          onClose={() => setEditOpen(false)}
          onCreate={(data) => updateAthleteInfo(detailAthlete.id, data)}
        />
      ) : null}
    </div>
  );
}

function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<void> }) {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const canRefresh = distance >= PULL_THRESHOLD;

  async function refresh() {
    setRefreshing(true);
    setDistance(PULL_THRESHOLD);
    try {
      await onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
      setDistance(0);
    }
  }

  return (
    <div
      className="relative flex flex-1 flex-col"
      onTouchStart={(event) => {
        if (refreshing || window.scrollY > 0) return;
        startY.current = event.touches[0]?.clientY ?? null;
        pulling.current = false;
      }}
      onTouchMove={(event) => {
        if (refreshing || startY.current == null) return;
        const delta = (event.touches[0]?.clientY ?? 0) - startY.current;
        if (delta <= 0 || window.scrollY > 0) {
          setDistance(0);
          return;
        }
        pulling.current = true;
        setDistance(Math.min(PULL_MAX, delta * 0.55));
      }}
      onTouchEnd={() => {
        startY.current = null;
        if (!pulling.current || refreshing) {
          setDistance(0);
          return;
        }
        pulling.current = false;
        if (distance >= PULL_THRESHOLD) {
          void refresh();
        } else {
          setDistance(0);
        }
      }}
      onTouchCancel={() => {
        startY.current = null;
        pulling.current = false;
        if (!refreshing) setDistance(0);
      }}
    >
      <div
        className="pointer-events-none fixed left-1/2 top-[calc(var(--safe-top)+0.75rem)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface/95 px-4 py-2 text-xs font-bold text-foreground shadow-float backdrop-blur transition-all duration-200 print:hidden"
        style={{
          opacity: distance > 8 || refreshing ? 1 : 0,
          transform: `translate(-50%, ${refreshing ? 20 : Math.round(distance * 0.45)}px)`,
        }}
      >
        <span className={`size-3 rounded-full border-2 border-brand border-t-transparent ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Actualizando' : canRefresh ? 'Soltar para refrescar' : 'Estirar para refrescar'}
      </div>
      <div
        className="flex flex-1 flex-col transition-transform duration-200"
        style={{ transform: distance > 0 && !refreshing ? `translateY(${Math.round(distance * 0.35)}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="mb-8 flex items-center gap-3 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpg" alt="In Move" className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border" />
      <div>
        <p className="text-2xl font-bold uppercase tracking-[-0.04em] leading-none">
          <span className="text-brand">IN</span>MOVE
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Centro de rendimiento</p>
      </div>
    </div>
  );
}

function NavRail({ current, onChange }: { current: ViewId; onChange: (view: ViewId) => void }) {
  const secondaryItems = [
    { label: 'Rendimiento', icon: LineChart },
    { label: 'Bienestar', icon: HeartPulse },
    { label: 'Calendario', icon: CalendarDays },
    { label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <nav className="flex flex-col gap-2">
      {viewItems.map((item) => {
        const Icon = item.icon;
        const active = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex h-12 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${
              active ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <Icon className="size-5" />
            {item.label}
          </button>
        );
      })}
      <div className="my-2 h-px bg-border" />
      {secondaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground/45">
            <Icon className="size-5" />
            {item.label}
            <span className="ml-auto rounded-sm bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Pronto</span>
          </div>
        );
      })}
    </nav>
  );
}

function AthletesTable({
  athletes: visibleAthletes,
  categoryOptions,
  query,
  category,
  onQuery,
  onCategory,
  onCreate,
  onOpen,
}: {
  athletes: Athlete[];
  categoryOptions: string[];
  query: string;
  category: string;
  onQuery: (query: string) => void;
  onCategory: (category: string) => void;
  onCreate: () => void;
  onOpen: (athlete: Athlete) => void;
}) {
  return (
    <section className="surface-1 rounded-lg p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{visibleAthletes.length} deportistas</p>
          <h2 className="text-xl font-semibold">Listado de deportistas</h2>
        </div>
        <Button onClick={onCreate}>
          <UserRound />
          Nuevo deportista
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex h-12 items-center gap-3 rounded-sm border border-border bg-background px-3">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar por nombre, codigo o documento"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex h-12 items-center gap-2 rounded-sm border border-border bg-background px-3">
          <ListFilter className="size-5 text-muted-foreground" />
          <select
            value={category}
            onChange={(event) => onCategory(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          >
            {categoryOptions.map((groupName) => (
              <option key={groupName} className="bg-surface text-foreground">
                {groupName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">Deportista</th>
              <th className="px-3 py-3">Codigo</th>
              <th className="px-3 py-3">Categoria / Grupo</th>
              <th className="px-3 py-3">Ultima ficha</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleAthletes.map((athlete) => {
              const fichas = athlete.assessments.filter((a) => a.id);
              const latest = fichas[0];
              return (
                <tr
                  key={athlete.id}
                  onClick={() => onOpen(athlete)}
                  className="cursor-pointer border-b border-border/60 transition hover:bg-white/5"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{athlete.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{athlete.sport} · {athlete.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs tracking-[0.14em] text-brand">{athlete.code}</td>
                  <td className="px-3 py-3 text-muted-foreground">{athlete.category}{athlete.group ? ` · ${athlete.group}` : ''}</td>
                  <td className="px-3 py-3 text-muted-foreground">{latest ? formatDate(latest.date) : 'Sin ficha'}</td>
                  <td className="px-3 py-3"><StatusBadge level={athlete.status} label={athlete.statusLabel} size="sm" /></td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      Ver <ChevronRight className="size-4" />
                    </span>
                  </td>
                </tr>
              );
            })}
            {visibleAthletes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  No hay deportistas que coincidan con la búsqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AthleteDetailView({
  athlete,
  isAdmin,
  onBack,
  onViewFicha,
  onEditInfo,
  onNewFicha,
  onEditFicha,
}: {
  athlete: Athlete;
  isAdmin: boolean;
  onBack: () => void;
  onViewFicha: (assessment: Assessment) => void;
  onEditInfo: () => void;
  onNewFicha: () => void;
  onEditFicha: (assessment: Assessment) => void;
}) {
  const fichas = athlete.assessments.filter((a) => a.id);
  const latest = fichas[0];
  const [zoom, setZoom] = useState(false);
  const w = latest?.profile?.weight;
  const h = latest?.profile?.height;
  const imc = latest?.raw?.anthropometry?.imc ?? null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft />
          Volver
        </Button>
        <div className="flex flex-wrap gap-2">
          {latest ? (
            <Button size="sm" variant="outline" onClick={() => onViewFicha(latest)}>
              <Eye />
              Ver ficha completa
            </Button>
          ) : null}
          {isAdmin ? (
            <>
              <Button size="sm" variant="outline" onClick={onEditInfo}>
                <Pencil />
                Editar información
              </Button>
              <Button size="sm" onClick={onNewFicha}>
                <FilePlus />
                Generar nueva ficha
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <section className="surface-1 rounded-lg p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => athlete.photoUrl && setZoom(true)}
              className="group relative shrink-0"
              title="Ampliar foto"
            >
              <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size="lg" />
              {athlete.photoUrl ? (
                <span className="absolute inset-0 grid place-items-center rounded-md bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  <Search className="size-5 text-white" />
                </span>
              ) : null}
            </button>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold">{athlete.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{athlete.category} · {athlete.group} · {athlete.sport} · {athlete.position}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge level={athlete.status} label={athlete.statusLabel} />
                <span className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">Codigo {athlete.code}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                <ReportFact label="Documento" value={athlete.document} />
                <ReportFact label="Nacimiento" value={formatDate(athlete.birthDate)} />
                <ReportFact label="Sexo" value={athlete.sex === 'M' ? 'Masculino' : 'Femenino'} />
                <ReportFact label="Fichas" value={fichas.length} />
              </div>
            </div>
          </div>
          {latest ? (
            <div className="rounded-lg border border-border bg-background/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Última ficha · {formatDate(latest.date)}</p>
              <RadarChart data={latest.radar} compact />
            </div>
          ) : null}
        </div>
      </section>

      {latest ? (
        <section className="surface-1 rounded-lg p-5">
          <SectionHeader eyebrow={`Última ficha · ${formatDate(latest.date)}`} title="Indicadores clave" />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Peso" value={w == null ? '—' : `${w} kg`} icon={Gauge} />
            <SummaryTile label="Estatura" value={h == null ? '—' : `${h} cm`} icon={Gauge} />
            <SummaryTile label="IMC" value={imc == null ? '—' : imc.toFixed(1)} icon={Gauge} />
            <SummaryTile
              label="Edad"
              value={latest.profile?.chronologicalAge == null ? '—' : `${latest.profile.chronologicalAge} años`}
              icon={CalendarDays}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {latest.metrics.map((metric) => (
              <MetricInputCard key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface-1 rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="size-5 text-brand" />
          <h3 className="text-lg font-semibold">Histórico de fichas</h3>
        </div>
        {fichas.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Aún no hay fichas para este deportista.</p>
            {isAdmin ? (
              <Button className="mt-4" size="sm" onClick={onNewFicha}>
                <FilePlus />
                Generar primera ficha
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {fichas.map((ficha, index) => (
              <div key={ficha.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/35 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-sm bg-brand/10 text-sm font-bold text-brand">{fichas.length - index}</span>
                  <div>
                    <p className="font-semibold">{formatDate(ficha.date)}{index === 0 ? ' · actual' : ''}</p>
                    <p className="text-xs text-muted-foreground">Score {ficha.score}/100</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onViewFicha(ficha)}>
                    <Eye />
                    Ver
                  </Button>
                  {isAdmin ? (
                    <Button size="sm" variant="outline" onClick={() => onEditFicha(ficha)}>
                      <Pencil />
                      Editar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {zoom && athlete.photoUrl ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={athlete.photoUrl} alt={athlete.name} className="max-h-[90dvh] max-w-[92vw] rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-md bg-white/10 text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AssessmentView({
  athlete,
  assessment,
  assessmentId,
  isAdmin,
  onBack,
  onSave,
  onPhotoChange,
  onPreviewPublic,
}: {
  athlete: Athlete;
  assessment: Assessment;
  assessmentId?: string;
  isAdmin: boolean;
  onBack: () => void;
  onSave: (draft: AssessmentDraftInput) => Promise<void>;
  onPhotoChange: (photoUrl: string) => void;
  onPreviewPublic: (assessment: Assessment) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<AssessmentDraft>(() => {
    const s = (v: number | string | null | undefined) => (v == null || v === '' ? '' : String(v));
    const a = assessment.raw?.anthropometry ?? {};
    const c = assessment.raw?.cardio ?? {};
    const r = assessment.raw?.rom ?? {};
    const f = assessment.raw?.flexibility ?? {};
    const p = assessment.raw?.performance ?? {};
    return {
      weight: s(a.pesoKg), height: s(a.estaturaCm), sittingHeight: s(a.estaturaSentadoCm), imc: s(a.imc), fat: s(a.pctGrasa), masa: s(a.pctMasa),
      restingHr: s(c.fcReposo), fcInicial: s(c.fcInicial), fcFinal: s(c.fcFinal), fcMax: s(c.fcMax),
      colFlex: s(r.columnaFlexion), colExt: s(r.columnaExtension),
      hombRotIntIzq: s(r.hombroRotIntIzq), hombRotIntDer: s(r.hombroRotIntDer),
      hombRotExtIzq: s(r.hombroRotExtIzq), hombRotExtDer: s(r.hombroRotExtDer),
      hombFlexIzq: s(r.hombroFlexionIzq), hombFlexDer: s(r.hombroFlexionDer),
      caderaIzq: s(r.caderaFlexionIzq), caderaDer: s(r.caderaFlexionDer),
      rodillaIzq: s(r.rodillaFlexionIzq), rodillaDer: s(r.rodillaFlexionDer),
      otraLabel: s(r.otraLabel), otraValor: s(r.otraValor),
      pruebaAplicada: s(f.pruebaAplicada), sitReach: s(f.resultadoCm), flexObs: s(f.observacion),
      sj: s(p.sjCm), cmj: s(p.cmjCm), abalakov: s(p.abalakovCm),
      saltoUniDer: s(p.saltoUnilateralDerCm), saltoUniIzq: s(p.saltoUnilateralIzqCm),
      fuerzaMax: s(p.fuerzaMaximaKg),
      squatLoad: s(p.sentadillaCargaKg),
      squat1rm: s(p.sentadilla1rmKg),
      squatVm: s(p.sentadillaVelocidadMediaMs),
      squatPower: s(p.sentadillaPotenciaW),
      pct1rm: s(p.pct1rmSentadilla),
      bancaLoad: s(p.pressBancaCargaKg),
      banca1rm: s(p.pressBanca1rmKg),
      bancaVm: s(p.pressBancaVelocidadMediaMs),
      bancaPower: s(p.pressBancaPotenciaW),
      bancaPct1rm: s(p.pct1rmPressBanca),
      speed10m: s(p.velocidad10mS), speed20m: s(p.velocidad20mS), speed30m: s(p.velocidad30mS),
      agilityLabel: s(p.agilidadLabel), agilidad505: s(p.agilidad505S), vo2: s(p.vo2Ml),
      notes: assessment.profile?.notes || '', plan: assessment.raw?.plan ?? '',
    };
  });
  const [selectedSprintDistances, setSelectedSprintDistances] = useState<SprintDistance[]>(() => {
    const p = assessment.raw?.performance ?? {};
    const selected: SprintDistance[] = [];
    if (p.velocidad10mS != null) selected.push('10');
    if (p.velocidad20mS != null) selected.push('20');
    if (p.velocidad30mS != null) selected.push('30');
    return selected.length > 0 ? selected : ['10'];
  });
  const updateDraft = (key: keyof AssessmentDraft, value: string) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'squatLoad' || key === 'squat1rm') {
        const previousPct = calcPct1rm(current.squatLoad, current.squat1rm);
        const nextPct = calcPct1rm(next.squatLoad, next.squat1rm);
        if (!current.pct1rm || current.pct1rm === previousPct) next.pct1rm = nextPct;
      }
      if (key === 'bancaLoad' || key === 'banca1rm') {
        const previousPct = calcPct1rm(current.bancaLoad, current.banca1rm);
        const nextPct = calcPct1rm(next.bancaLoad, next.banca1rm);
        if (!current.bancaPct1rm || current.bancaPct1rm === previousPct) next.bancaPct1rm = nextPct;
      }
      return next;
    });
  const toggleSprintDistance = (distance: (typeof sprintDistances)[number]) => {
    setSelectedSprintDistances((current) => {
      const active = current.includes(distance.value);
      if (active && current.length === 1) return current;
      if (active) {
        updateDraft(distance.key, '');
        return current.filter((item) => item !== distance.value);
      }
      return [...current, distance.value];
    });
  };

  // Helper compacto para los campos de la ficha completa.
  const F = (label: string, k: keyof AssessmentDraft, ph = '', mode: 'decimal' | 'numeric' | 'text' = 'decimal') => (
    <FormField label={label}>
      <input
        disabled={!isAdmin}
        inputMode={mode === 'text' ? undefined : mode}
        value={draft[k]}
        onChange={(event) => updateDraft(k, event.target.value)}
        placeholder={ph}
        className="field-control"
      />
    </FormField>
  );

  const fatValue = toNumber(draft.fat);
  const restingHrValue = toNumber(draft.restingHr);
  const sitReachValue = toNumber(draft.sitReach);
  const cmjValue = toNumber(draft.cmj);
  const weightValue = toNumber(draft.weight);
  const heightValue = toNumber(draft.height);
  const sittingHeightValue = toNumber(draft.sittingHeight);
  const imcValue = toNumber(draft.imc);
  const speed10mValue = toNumber(draft.speed10m);
  const selectedSprintConfig =
    sprintDistances.find((distance) => selectedSprintDistances.includes(distance.value) && draft[distance.key].trim() !== '') ??
    sprintDistances.find((distance) => selectedSprintDistances.includes(distance.value)) ??
    sprintDistances[0];
  const sprintDistanceM = Number(selectedSprintConfig.value);
  const sprintValue = toNumber(draft[selectedSprintConfig.key]);
  const squatValue = toNumber(draft.squat1rm);
  const vo2Value = toNumber(draft.vo2);
  const kmh = kmhFromSprint(sprintDistanceM, sprintValue);
  const age = chronologicalAge(athlete.birthDate, assessment.date);
  const bioAge = biologicalAge(athlete.sex, athlete.birthDate, assessment.date, heightValue, sittingHeightValue, weightValue);
  const fatStatus = classifyFat(athlete.sex, fatValue);
  const hrStatus = classifyRestingHr(restingHrValue);
  const sitReachStatus = classifySitReach(athlete.sex, sitReachValue);
  const cmjStatus = classifyCmj(cmjValue);
  const displayMetrics = [
    { label: 'Grasa corporal', value: fatValue ?? 0, unit: '%', level: fatStatus.level, levelLabel: fatStatus.label, range: fatStatus.range },
    { label: 'FC reposo', value: restingHrValue ?? 0, unit: 'ppm', level: hrStatus.level, levelLabel: hrStatus.label, range: hrStatus.range },
    { label: 'Sit and reach', value: sitReachValue ?? 0, unit: 'cm', level: sitReachStatus.level, levelLabel: sitReachStatus.label, range: sitReachStatus.range },
    { label: 'CMJ', value: cmjValue ?? 0, unit: 'cm', level: cmjStatus.level, levelLabel: cmjStatus.label, range: cmjStatus.range },
  ];
  const liveRadar: RadarMetric[] = [
    { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: normalize(squatValue, 40, 140), team: 70, raw: squatValue == null ? 'Sin dato' : `${squatValue} kg`, source: 'Sentadilla 1RM' },
    { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: normalizeSpeed(sprintValue == null ? null : sprintValue * (10 / sprintDistanceM)), team: 68, raw: kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`, source: `Sprint ${sprintDistanceM} m` },
    { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: normalize(vo2Value, 30, 65), team: 66, raw: vo2Value == null ? 'Sin dato' : `${vo2Value} ml/kg`, source: 'VO2max' },
    { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: normalize(cmjValue, 15, 55), team: 61, raw: cmjValue == null ? 'Sin dato' : `${cmjValue} cm`, source: 'CMJ' },
  ];
  const liveAssessment: Assessment = {
    date: assessment.date,
    score: Math.round(liveRadar.reduce((total, metric) => total + metric.score, 0) / liveRadar.length),
    radar: liveRadar,
    metrics: displayMetrics,
    profile: {
      weight: weightValue,
      height: heightValue,
      bmi: imcValue,
      chronologicalAge: age,
      biologicalAge: bioAge,
      speed10m: speed10mValue,
      squat1rm: squatValue,
      vo2: vo2Value,
      notes: draft.notes.trim(),
    },
    raw: {
      ...(assessment.raw ?? {}),
      anthropometry: {
        ...(assessment.raw?.anthropometry ?? {}),
        pesoKg: weightValue ?? undefined,
        estaturaCm: heightValue ?? undefined,
        estaturaSentadoCm: sittingHeightValue ?? undefined,
        imc: imcValue ?? undefined,
        pctGrasa: fatValue ?? undefined,
        pctMasa: toNumber(draft.masa) ?? undefined,
      },
      performance: {
        ...(assessment.raw?.performance ?? {}),
        sjCm: toNumber(draft.sj) ?? undefined,
        cmjCm: cmjValue ?? undefined,
        abalakovCm: toNumber(draft.abalakov) ?? undefined,
        saltoUnilateralDerCm: toNumber(draft.saltoUniDer) ?? undefined,
        saltoUnilateralIzqCm: toNumber(draft.saltoUniIzq) ?? undefined,
        fuerzaMaximaKg: toNumber(draft.fuerzaMax) ?? undefined,
        sentadillaCargaKg: toNumber(draft.squatLoad) ?? undefined,
        sentadillaVelocidadMediaMs: toNumber(draft.squatVm) ?? undefined,
        sentadillaPotenciaW: toNumber(draft.squatPower) ?? undefined,
        sentadilla1rmKg: squatValue ?? undefined,
        pct1rmSentadilla: toNumber(draft.pct1rm) ?? undefined,
        pressBancaCargaKg: toNumber(draft.bancaLoad) ?? undefined,
        pressBancaVelocidadMediaMs: toNumber(draft.bancaVm) ?? undefined,
        pressBancaPotenciaW: toNumber(draft.bancaPower) ?? undefined,
        pressBanca1rmKg: toNumber(draft.banca1rm) ?? undefined,
        pct1rmPressBanca: toNumber(draft.bancaPct1rm) ?? undefined,
        velocidad10mS: speed10mValue ?? undefined,
        velocidad20mS: toNumber(draft.speed20m) ?? undefined,
        velocidad30mS: toNumber(draft.speed30m) ?? undefined,
        agilidadLabel: draft.agilityLabel.trim() || undefined,
        agilidad505S: toNumber(draft.agilidad505) ?? undefined,
        vo2Ml: vo2Value ?? undefined,
      },
      plan: draft.plan.trim(),
    },
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
      <section className="surface-1 rounded-lg p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft />
            Volver
          </Button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">{assessmentId ? 'Editar ficha' : 'Nueva ficha'}</p>
            <h2 className="text-2xl font-semibold">{athlete.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {athlete.code} · {athlete.group} · {formatDate(assessment.date)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!isAdmin || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(draft);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                } catch (error) {
                  console.error(error);
                  alert('No se pudo guardar la valoración.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Check />
              {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar valoracion'}
            </Button>
            <Button variant="outline" onClick={() => onPreviewPublic(liveAssessment)}>
              <Eye />
              Ver valoracion final
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-lg border border-border bg-background/35 p-4 md:grid-cols-[120px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-brand/35 bg-brand/5 p-3">
            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size="lg" />
            <span className="mt-3 text-xs font-semibold text-muted-foreground">Foto</span>
            {isAdmin ? (
              <PhotoCaptureControls
                compact
                onPhoto={onPhotoChange}
              />
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre del deportista">
              <input disabled={!isAdmin} defaultValue={athlete.name} className="field-control" />
            </FormField>
            <FormField label="Documento de identidad">
              <input disabled={!isAdmin} defaultValue={athlete.document} className="field-control" />
            </FormField>
            <FormField label="Fecha de nacimiento">
              <input disabled={!isAdmin} type="date" defaultValue={athlete.birthDate} className="field-control" />
            </FormField>
            <FormField label="Edad cronologica">
              <input readOnly value={age == null ? '—' : `${age} años`} className="field-control" />
            </FormField>
            <FormField label="Edad biologica estimada">
              <input readOnly value={bioAge == null ? 'Falta peso, estatura o estatura sentado' : `${bioAge.toFixed(1)} años`} className="field-control" />
            </FormField>
            <FormField label="Estatura sentado (cm)">
              <input disabled={!isAdmin} inputMode="decimal" value={draft.sittingHeight} onChange={(event) => updateDraft('sittingHeight', event.target.value)} placeholder="Ej. 83" className="field-control" />
            </FormField>
            <FormField label="Sexo">
              <select disabled={!isAdmin} defaultValue={athlete.sex} className="field-control">
                <option className="bg-surface" value="M">Masculino</option>
                <option className="bg-surface" value="F">Femenino</option>
              </select>
            </FormField>
            <FormField label="Categoria">
              <input disabled={!isAdmin} defaultValue={athlete.category} className="field-control" />
            </FormField>
            <FormField label="Codigo generado">
              <input readOnly value={athlete.code.replace(/(\d{2})(?=\d)/g, '$1 ')} className="field-control font-mono tracking-[0.18em] text-brand" />
            </FormField>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FormField label="% Grasa corporal">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.fat} onChange={(event) => updateDraft('fat', event.target.value)} placeholder="Ej. 14" className="field-control" />
          </FormField>
          <FormField label="FC en reposo (ppm)">
            <input disabled={!isAdmin} inputMode="numeric" value={draft.restingHr} onChange={(event) => updateDraft('restingHr', event.target.value)} placeholder="Ej. 58" className="field-control" />
          </FormField>
          <FormField label="Sit and Reach (cm)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.sitReach} onChange={(event) => updateDraft('sitReach', event.target.value)} placeholder="Ej. 30" className="field-control" />
          </FormField>
          <FormField label="Salto CMJ (cm)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.cmj} onChange={(event) => updateDraft('cmj', event.target.value)} placeholder="Ej. 42" className="field-control" />
          </FormField>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FormField label="Peso (kg)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.weight} onChange={(event) => updateDraft('weight', event.target.value)} placeholder="57.4" className="field-control" />
          </FormField>
          <FormField label="Estatura (cm)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.height} onChange={(event) => updateDraft('height', event.target.value)} placeholder="162" className="field-control" />
          </FormField>
          <FormField label="IMC">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.imc} onChange={(event) => updateDraft('imc', event.target.value)} placeholder="Ej. 21.9" className="field-control" />
          </FormField>
          <FormField label="Resistencia VO2max (ml/kg)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.vo2} onChange={(event) => updateDraft('vo2', event.target.value)} placeholder="52" className="field-control" />
          </FormField>
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Antropometría</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('% Masa corporal (magra)', 'masa', 'Ej. 34')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Control cardiovascular</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('FC inicial (ppm)', 'fcInicial', 'Ej. 80', 'numeric')}
          {F('FC final (ppm)', 'fcFinal', 'Ej. 150', 'numeric')}
          {F('FC máxima (ppm)', 'fcMax', 'Ej. 195', 'numeric')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Movilidad y flexibilidad (ROM · grados)</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('Columna · Flexión', 'colFlex', 'Ej. 76')}
          {F('Columna · Extensión', 'colExt', 'Ej. 38')}
          {F('Hombro rot. int. IZQ', 'hombRotIntIzq')}
          {F('Hombro rot. int. DER', 'hombRotIntDer')}
          {F('Hombro rot. ext. IZQ', 'hombRotExtIzq')}
          {F('Hombro rot. ext. DER', 'hombRotExtDer')}
          {F('Hombro flexión IZQ', 'hombFlexIzq')}
          {F('Hombro flexión DER', 'hombFlexDer')}
          {F('Cadera flexión IZQ', 'caderaIzq')}
          {F('Cadera flexión DER', 'caderaDer')}
          {F('Rodilla flexión IZQ', 'rodillaIzq')}
          {F('Rodilla flexión DER', 'rodillaDer')}
          {F('Otra prueba (etiqueta)', 'otraLabel', 'Ej. Tobillo', 'text')}
          {F('Otra prueba (valor)', 'otraValor')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Flexibilidad</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('Prueba aplicada', 'pruebaAplicada', 'Ej. Sit and Reach', 'text')}
          {F('Observación flexibilidad', 'flexObs', 'Opcional', 'text')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Rendimiento · Fuerza y potencia</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('Squat Jump (cm)', 'sj')}
          {F('Abalakov (cm)', 'abalakov')}
          {F('Salto unilateral DER (cm)', 'saltoUniDer')}
          {F('Salto unilateral IZQ (cm)', 'saltoUniIzq')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Perfil · fuerza y velocidad </h3>
        <p className="mt-3 rounded-md border border-border bg-background/35 px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground">
          Datos del encoder lineal: Carga, Vm, Potencia, 1RM y %1RM. El %1RM se sugiere desde Carga / 1RM y queda editable.
        </p>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/45 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">Sentadilla</p>
              <span className="rounded-sm border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">Encoder</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {F('Carga kg', 'squatLoad', 'Ej. 40')}
              {F('Vm m/s', 'squatVm', 'Ej. 0.87')}
              {F('Potencia W', 'squatPower', 'Ej. 341', 'numeric')}
              {F('1RM kg', 'squat1rm', 'Ej. 79.05')}
              {F('%1RM', 'pct1rm', 'Ej. 50.6')}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/45 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">Press de banca</p>
              <span className="rounded-sm border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">Encoder</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {F('Carga kg', 'bancaLoad', 'Ej. 30')}
              {F('Vm m/s', 'bancaVm', 'Ej. 0.85')}
              {F('Potencia W', 'bancaPower', 'Ej. 333', 'numeric')}
              {F('1RM kg', 'banca1rm', 'Ej. 75.47')}
              {F('%1RM', 'bancaPct1rm', 'Ej. 53')}
            </div>
          </div>
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Rendimiento · velocidad y agilidad</h3>
        <div className="rounded-lg border border-border bg-background/35 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Distancias medidas</p>
            <div className="flex flex-wrap gap-2">
              {sprintDistances.map((distance) => {
                const active = selectedSprintDistances.includes(distance.value);
                return (
                  <button
                    key={distance.value}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => toggleSprintDistance(distance)}
                    className={`h-10 rounded-md border px-4 text-sm font-bold transition ${
                      active
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-surface text-muted-foreground'
                    }`}
                  >
                    {distance.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sprintDistances
              .filter((distance) => selectedSprintDistances.includes(distance.value))
              .map((distance) => (
                <FormField key={distance.value} label={`${distance.label} (s)`}>
                  <input
                    disabled={!isAdmin}
                    inputMode="decimal"
                    value={draft[distance.key]}
                    onChange={(event) => updateDraft(distance.key, event.target.value)}
                    placeholder={distance.placeholder}
                    className="field-control"
                  />
                </FormField>
              ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {F('Test de agilidad', 'agilityLabel', 'Ej. T-test / 10M-5M-5M', 'text')}
          {F('Valor agilidad (s)', 'agilidad505', 'Ej. 5.2')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Observaciones y plan</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {F('Observaciones generales', 'notes', 'Notas de la valoración', 'text')}
          {F('Plan / recomendaciones', 'plan', 'Recomendaciones para el deportista', 'text')}
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-brand">Resultados en vivo</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric label="% Grasa corporal" value={fatValue ?? '—'} suffix="%" footer={fatStatus.label} delta="en vivo" icon={Gauge} series={[...metricSeries.fat]} />
          <DashboardMetric label="FC en reposo" value={restingHrValue ?? '—'} suffix="ppm" footer={hrStatus.label} delta="en vivo" icon={HeartPulse} series={[...metricSeries.heart]} />
          <DashboardMetric label="CMJ (salto)" value={cmjValue ?? '—'} suffix="cm" footer={cmjStatus.label} delta="en vivo" icon={Activity} series={[...metricSeries.jump]} />
          <DashboardMetric label={`Sprint ${sprintDistanceM} m`} value={sprintValue ?? '—'} suffix="s" footer={kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`} delta="en vivo" icon={Flame} series={[...metricSeries.sprint]} invertSeries />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {displayMetrics.map((metric) => (
            <MetricInputCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="mt-6 rounded-md border border-border bg-background/45 p-4">
          <div className="flex items-center gap-3">
            <Gauge className="size-5 text-brand" />
            <div>
              <h3 className="font-semibold">Captura tablet-first</h3>
              <p className="text-sm leading-5 text-muted-foreground">
                En vertical se prioriza una columna legible; en horizontal se divide ficha y resultados para evaluar sin perder contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
        <div className="surface-1 rounded-lg p-4 md:p-5">
          <SectionHeader eyebrow="Resultado en vivo" title="Perfil de rendimiento" />
          <RadarChart data={liveRadar} />
        </div>
        <div className="surface-1 rounded-lg p-4 md:p-5">
          <SectionHeader eyebrow="Escalas" title="Semaforo por indicador" />
          <div className="space-y-3">
            {displayMetrics.map((metric) => (
              <ScaleRow key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
        <ScaleTableCard selected={athlete} metric={displayMetrics[0]} />
      </section>
    </div>
  );
}

function DashboardView({ athletes }: { athletes: Athlete[] }) {
  const topAthletes = [...athletes].sort((a, b) => b.assessments[0].score - a.assessments[0].score);
  const averageScore = Math.round(
    athletes.reduce((total, athlete) => total + athlete.assessments[0].score, 0) / athletes.length,
  );
  const totalAssessments = athletes.reduce((total, athlete) => total + athlete.assessments.length, 0);
  const followUp = athletes.filter((athlete) => athlete.status === 'warning').length;

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric label="Deportistas activos" value={athletes.length} footer="Base actual" delta="+2 este mes" icon={UsersRound} series={[3, 3, 4, 4, athletes.length]} />
        <DashboardMetric label="Valoraciones" value={totalAssessments} footer="Registros totales" delta="+4 recientes" icon={ClipboardList} series={[1, 2, 3, 3, totalAssessments]} />
        <DashboardMetric label="Score promedio" value={averageScore} suffix="/100" footer="Todos los grupos" delta="▲ 5 pts" icon={BarChart3} series={[61, 64, 66, 70, averageScore]} />
        <DashboardMetric label="En seguimiento" value={followUp} footer="Requiere revision" delta={`${followUp} atleta(s)`} icon={ShieldCheck} series={[2, 2, 1, 1, followUp]} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_390px]">
        <GlobalDistributionCard athletes={athletes} />

        <div className="surface-1 rounded-lg p-4 md:p-5">
          <SectionHeader eyebrow="Ranking CMJ" title="Top interno" />
          <RankingList athletes={topAthletes} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)_minmax(320px,0.72fr)]">
        <OperationalLoadCard athletes={athletes} totalAssessments={totalAssessments} />
        <GlobalStatusCard athletes={athletes} />
        <RecentValuationsCard athletes={topAthletes} />
      </section>
    </div>
  );
}

function PublicAssessmentView({
  athlete,
  assessmentOverride,
}: {
  athlete: Athlete;
  assessmentOverride?: Assessment | null;
}) {
  const assessment = assessmentOverride ?? athlete.assessments[0];
  const bodyProfile = demoBodyProfile[athlete.id] ?? demoBodyProfile.daniel;
  const anthropometry = assessment.raw?.anthropometry;
  const profile = {
    weight: assessment.profile?.weight ?? bodyProfile.weight,
    height: assessment.profile?.height ?? bodyProfile.height,
    chronologicalAge: assessment.profile?.chronologicalAge ?? chronologicalAge(athlete.birthDate, assessment.date),
    biologicalAge:
      assessment.profile?.biologicalAge ??
      biologicalAge(
        athlete.sex,
        athlete.birthDate,
        assessment.date,
        anthropometry?.estaturaCm ?? assessment.profile?.height ?? bodyProfile.height,
        anthropometry?.estaturaSentadoCm ?? null,
        anthropometry?.pesoKg ?? assessment.profile?.weight ?? bodyProfile.weight,
      ),
    speed10m: assessment.profile?.speed10m,
    squat1rm: assessment.profile?.squat1rm,
    vo2: assessment.profile?.vo2,
    notes: assessment.profile?.notes || bodyProfile.notes,
  };
  const fatMetric = assessment.metrics.find((metric) => metric.label === 'Grasa corporal');
  const speedMetric = assessment.radar.find((metric) => metric.key === 'speed');
  const strengthMetric = assessment.radar.find((metric) => metric.key === 'strength');
  const enduranceMetric = assessment.radar.find((metric) => metric.key === 'endurance');
  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <section className="surface-1 rounded-lg p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)_150px] lg:items-center">
          <ReportPhoto athlete={athlete} />

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Valoracion final</p>
            <h2 className="mt-1 text-3xl font-semibold">{athlete.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Codigo {athlete.code} · {athlete.category} · {athlete.group} · {formatDate(assessment.date)}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReportFact label="Documento" value={athlete.document} />
              <ReportFact label="Nacimiento" value={formatDate(athlete.birthDate)} />
              <ReportFact label="Edad cronologica" value={profile.chronologicalAge == null ? '—' : `${profile.chronologicalAge} años`} />
              <ReportFact label="Edad biologica est." value={profile.biologicalAge == null ? '—' : `${profile.biologicalAge.toFixed(1)} años`} />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <StatusBadge level={athlete.status} label={athlete.statusLabel} />
            <p className="tabular text-3xl font-bold text-brand">{assessment.score}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportDataCard title="Datos corporales" rows={[
          { label: 'Peso', value: profile.weight == null ? '—' : `${profile.weight} kg` },
          { label: 'Estatura', value: profile.height == null ? '—' : `${profile.height} cm` },
          { label: 'Grasa corporal', value: fatMetric ? `${fatMetric.value}${fatMetric.unit}` : '—' },
        ]} />
        <ReportDataCard title="Rendimiento base" rows={[
          { label: 'Fuerza', value: strengthMetric?.raw ?? '—' },
          { label: 'Velocidad', value: speedMetric?.raw ?? '—' },
          { label: 'Resistencia', value: enduranceMetric?.raw ?? '—' },
        ]} />
        <ReportDataCard title="Contexto deportivo" rows={[
          { label: 'Sexo', value: athlete.sex === 'M' ? 'Masculino' : 'Femenino' },
          { label: 'Deporte', value: athlete.sport },
          { label: 'Perfil', value: athlete.position },
        ]} />
        <ReportDataCard title="Observaciones" rows={[
          { label: 'Nota', value: profile.notes || 'Sin observaciones registradas' },
        ]} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="surface-1 rounded-lg p-5">
          <SectionHeader eyebrow="Perfil" title="Radar de rendimiento" />
          <RadarChart data={assessment.radar} />
        </div>
        <div className="surface-1 rounded-lg p-5">
          <SectionHeader eyebrow="Resumen" title="Indicadores principales" />
          <div className="space-y-3">
            {assessment.metrics.map((metric) => (
              <ScaleRow key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {assessment.radar.map((metric) => (
          <RadarDetailRow key={metric.key} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {assessment.metrics.map((metric) => (
          <MetricInputCard key={metric.label} metric={metric} />
        ))}
      </section>
    </div>
  );
}

function ReportPhoto({ athlete }: { athlete: Athlete }) {
  return (
    <div className="flex items-center gap-4 lg:block">
      <div className="grid h-[150px] w-[120px] shrink-0 place-items-center overflow-hidden rounded-lg border border-brand/25 bg-brand/8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={athlete.photoUrl ?? defaultAthletePhoto} alt={athlete.name} className="h-full w-full object-cover" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground lg:mt-2">Foto del deportista</p>
    </div>
  );
}

function ReportFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function ReportDataCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string | number }> }) {
  return (
    <article className="rounded-lg border border-border bg-background/35 p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="max-w-[62%] text-right text-sm font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RadarChart({ data, compact = false }: { data: RadarMetric[]; compact?: boolean }) {
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        className="group mx-auto block w-full max-w-[420px] rounded-lg outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Ampliar radar de rendimiento"
      >
        <RadarChartSvg data={data} compact={compact} />
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition group-hover:text-brand">
          <Search className="size-3.5" />
          Click para ampliar
        </span>
      </button>

      {zoomOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Radar de rendimiento ampliado"
          onClick={() => setZoomOpen(false)}
        >
          <section
            className="surface-2 w-full max-w-4xl rounded-lg p-4 shadow-float md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Perfil</p>
                <h2 className="text-xl font-semibold">Radar de rendimiento</h2>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="grid size-10 place-items-center rounded-md border border-border bg-background/40 text-muted-foreground transition hover:text-foreground"
                aria-label="Cerrar radar ampliado"
              >
                <X className="size-5" />
              </button>
            </div>
            <RadarChartSvg data={data} large />
          </section>
        </div>
      ) : null}
    </>
  );
}

function RadarChartSvg({ data, compact = false, large = false }: { data: RadarMetric[]; compact?: boolean; large?: boolean }) {
  const size = compact ? 260 : 360;
  const padX = compact ? 30 : 46; // margen para etiquetas laterales
  const center = size / 2;
  const radius = compact ? 86 : 124;
  const angles = [-90, 0, 90, 180].map((angle) => (angle * Math.PI) / 180);
  const point = (index: number, value: number) => {
    const r = (radius * value) / 100;
    return [center + r * Math.cos(angles[index]), center + r * Math.sin(angles[index])] as const;
  };
  const polygon = (key: 'score' | 'team') => data.map((metric, index) => point(index, metric[key]).join(',')).join(' ');

  return (
    <div className={`mx-auto w-full ${large ? 'max-w-[720px]' : 'max-w-[420px]'}`}>
      <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} role="img" aria-label="Radar de rendimiento del atleta" className="h-auto w-full">
        {[25, 50, 75, 100].map((level) => (
          <polygon
            key={level}
            points={data.map((_, index) => point(index, level).join(',')).join(' ')}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={level === 100 ? 1.5 : 1}
          />
        ))}
        {data.map((_, index) => {
          const [x, y] = point(index, 100);
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth="1" />;
        })}
        <polygon points={polygon('team')} fill="hsl(var(--muted-foreground) / 0.08)" stroke="hsl(var(--muted-foreground) / 0.7)" strokeDasharray="5 5" strokeWidth="2" />
        <polygon points={polygon('score')} fill="hsl(var(--brand) / 0.18)" stroke="hsl(var(--brand))" strokeWidth="3" />
        {data.map((metric, index) => {
          const [x, y] = point(index, metric.score);
          return <circle key={metric.key} cx={x} cy={y} r={compact ? 4 : 5} fill="hsl(var(--brand))" stroke="hsl(var(--background))" strokeWidth="3" />;
        })}
        {data.map((metric, index) => {
          const [x, y] = point(index, 100);
          const offset = compact ? 16 : 22;
          const labelX = index === 1 ? x + offset : index === 3 ? x - offset : x;
          const labelY = index === 0 ? y - offset : index === 2 ? y + offset + 4 : y + 4;
          const anchor = index === 1 ? 'start' : index === 3 ? 'end' : 'middle';
          return (
            <g key={metric.key}>
              <text x={labelX} y={labelY} textAnchor={anchor} fill="hsl(var(--foreground))" fontSize={compact ? 10 : 12} fontWeight="700">
                {metric.shortLabel}
              </text>
              {!compact ? (
                <text x={labelX} y={labelY + 16} textAnchor={anchor} fill="hsl(var(--muted-foreground))" fontSize="11">
                  {metric.score}/100
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex justify-center gap-4 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-2"><i className="h-1 w-5 rounded bg-brand" />Atleta</span>
        <span className="inline-flex items-center gap-2"><i className="h-1 w-5 rounded bg-muted-foreground" />Equipo</span>
      </div>
    </div>
  );
}

function MetricInputCard({ metric }: { metric: Athlete['assessments'][number]['metrics'][number] }) {
  return (
    <article className={`surface-1 border-t-4 ${levelBorder[metric.level]} rounded-md p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="tabular text-[34px] font-bold leading-none">{metric.value}</span>
            <span className="text-sm font-semibold text-muted-foreground">{metric.unit}</span>
          </div>
        </div>
        <StatusBadge level={metric.level} label={metric.levelLabel} size="sm" />
      </div>
      <div className="mt-4 h-12 rounded-sm border border-border bg-background px-3 text-sm text-muted-foreground">
        <div className="flex h-full items-center justify-between">
          <span>Rango esperado</span>
          <span className="tabular font-semibold text-foreground">{metric.range}</span>
        </div>
      </div>
    </article>
  );
}

function ScaleRow({ metric }: { metric: Athlete['assessments'][number]['metrics'][number] }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{metric.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Referencia {metric.range}</p>
        </div>
        <StatusBadge level={metric.level} label={metric.levelLabel} />
      </div>
      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-sm">
        <div className="h-2 bg-level-danger" />
        <div className="h-2 bg-level-warning" />
        <div className="h-2 bg-level-good" />
      </div>
    </div>
  );
}

function RadarDetailRow({ metric }: { metric: RadarMetric }) {
  const delta = metric.score - metric.team;
  return (
    <div className="rounded-md border border-border bg-background/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{metric.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{metric.source} · {metric.raw}</p>
        </div>
        <span className="tabular text-2xl font-bold">{metric.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-sm bg-white/5">
        <div className="h-full rounded-sm bg-brand" style={{ width: `${metric.score}%` }} />
      </div>
      <p className={`mt-2 text-sm font-semibold ${delta >= 0 ? 'text-level-good' : 'text-level-danger'}`}>
        {delta >= 0 ? '+' : ''}{delta} vs promedio de equipo
      </p>
    </div>
  );
}

function ScaleTableCard({ selected, metric }: { selected: Athlete; metric?: Athlete['assessments'][number]['metrics'][number] }) {
  const fat = metric ?? selected.assessments[0].metrics[0];
  const rows = [
    { label: 'Esencial', range: '2 - 5%', level: 'elite' as Level },
    { label: 'Atleta', range: '6 - 13%', level: 'good' as Level, active: fat.value <= 13 },
    { label: 'Saludable', range: '14 - 17%', level: 'good' as Level, active: fat.value >= 14 && fat.value <= 17 },
    { label: 'Aceptable', range: '18 - 24%', level: 'warning' as Level },
    { label: 'Exceso', range: '>= 25%', level: 'danger' as Level },
  ];

  return (
    <div className="surface-1 rounded-lg p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <SectionHeader eyebrow="Escala aplicada" title="% Grasa corporal · hombres" />
        <StatusBadge level={fat.level} label={`Resultado ${fat.value}${fat.unit}`} size="sm" />
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 ${
              row.active ? 'bg-brand/10' : 'bg-background/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${levelDot[row.level]}`} />
              <span className="text-sm font-semibold text-muted-foreground">{row.label}</span>
            </div>
            <span className={row.active ? 'tabular text-sm font-bold text-brand' : 'tabular text-sm text-muted-foreground'}>
              {row.range}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlobalDistributionCard({ athletes }: { athletes: Athlete[] }) {
  const categories = Array.from(new Set(athletes.map((athlete) => athlete.category)));
  const groups = Array.from(new Set(athletes.map((athlete) => athlete.group)));
  const maxCategory = Math.max(...categories.map((category) => athletes.filter((athlete) => athlete.category === category).length), 1);
  const maxGroup = Math.max(...groups.map((group) => athletes.filter((athlete) => athlete.group === group).length), 1);

  return (
    <div className="surface-1 rounded-lg p-4 md:p-5">
      <SectionHeader eyebrow="Panel global" title="Distribucion de deportistas" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Por categoria</p>
          <div className="space-y-3">
            {categories.map((category) => {
              const count = athletes.filter((athlete) => athlete.category === category).length;
              return (
                <DistributionRow key={category} label={category} count={count} max={maxCategory} />
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Por grupo</p>
          <div className="space-y-3">
            {groups.map((group) => {
              const count = athletes.filter((athlete) => athlete.group === group).length;
              return (
                <DistributionRow key={group} label={group} count={count} max={maxGroup} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributionRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="tabular text-sm font-bold text-brand">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-white/5">
        <div className="h-full rounded-sm bg-brand" style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </div>
  );
}

function RankingList({ athletes }: { athletes: Athlete[] }) {
  return (
    <div className="space-y-3">
      {athletes.slice(0, 4).map((athlete, index) => (
        <button
          key={athlete.id}
          type="button"
          className="flex w-full items-center gap-3 rounded-md border border-border bg-background/35 p-3 text-left transition hover:border-brand/40"
        >
          <span className={`tabular grid size-8 place-items-center rounded-sm text-sm font-bold ${index === 0 ? 'bg-brand/15 text-brand' : 'bg-white/5 text-muted-foreground'}`}>
            {index + 1}
          </span>
          <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{athlete.name}</p>
            <p className="text-sm text-muted-foreground">{athlete.category} · {athlete.group}</p>
          </div>
          <span className="tabular text-brand">{athlete.assessments[0].metrics.find((metric) => metric.label === 'CMJ')?.value ?? '-'} cm</span>
        </button>
      ))}
    </div>
  );
}

function OperationalLoadCard({ athletes, totalAssessments }: { athletes: Athlete[]; totalAssessments: number }) {
  const athleteCount = Math.max(athletes.length, 1);
  const coverage = Math.round((athletes.filter((athlete) => athlete.assessments.length > 0).length / athleteCount) * 100);
  const latestDate = athletes.reduce((latest, athlete) => {
    const date = athlete.assessments[0]?.date;
    return date && date > latest ? date : latest;
  }, '');
  const latestPeriod = latestDate.slice(0, 7);
  const recentAssessments = athletes.filter((athlete) => athlete.assessments[0]?.date.startsWith(latestPeriod)).length;

  return (
    <div className="surface-1 rounded-lg p-4 md:p-5">
      <SectionHeader eyebrow="Carga operativa" title="Cobertura de valoraciones" />
      <div className="flex items-start justify-between">
        <div>
          <p className="tabular text-4xl font-bold">{coverage}%</p>
          <p className="mt-1 text-sm text-muted-foreground">{totalAssessments} registros · {recentAssessments} recientes</p>
        </div>
        <StatusBadge level={coverage >= 80 ? 'good' : 'warning'} label={coverage >= 80 ? 'Completo' : 'Pendiente'} />
      </div>
      <div className="mt-6">
        <MiniSparkline values={[40, 52, 58, 66, 74, coverage]} height={88} />
      </div>
    </div>
  );
}

function GlobalStatusCard({ athletes }: { athletes: Athlete[] }) {
  const athleteCount = Math.max(athletes.length, 1);
  const averageScore = Math.round(
    athletes.reduce((total, athlete) => total + athlete.assessments[0].score, 0) / athleteCount,
  );
  const statusRows = [
    { label: 'Atleta', count: athletes.filter((athlete) => athlete.status === 'elite').length, level: 'elite' as Level },
    { label: 'Optimo', count: athletes.filter((athlete) => athlete.status === 'good').length, level: 'good' as Level },
    { label: 'Seguimiento', count: athletes.filter((athlete) => athlete.status === 'warning').length, level: 'warning' as Level },
    { label: 'Alerta', count: athletes.filter((athlete) => athlete.status === 'danger').length, level: 'danger' as Level },
  ];
  const circumference = 2 * Math.PI * 42;
  const dash = (averageScore / 100) * circumference;

  return (
    <div className="surface-1 rounded-lg p-4 md:p-5">
      <SectionHeader eyebrow="Estado global" title="Score promedio" />
      <div className="grid grid-cols-[110px_1fr] items-center gap-4">
        <svg viewBox="0 0 110 110" className="size-[110px]">
          <circle cx="55" cy="55" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="9" />
          <circle
            cx="55"
            cy="55"
            r="42"
            fill="none"
            stroke="hsl(var(--brand))"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="58" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="700">{averageScore}</text>
          <text x="55" y="75" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">/100</text>
        </svg>
        <div className="space-y-3">
          {statusRows.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{item.label}</span>
                <span className="tabular">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-white/5">
                <div className={`h-full rounded-sm ${levelDot[item.level]}`} style={{ width: `${(item.count / athleteCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentValuationsCard({ athletes }: { athletes: Athlete[] }) {
  return (
    <div className="surface-1 rounded-lg p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader eyebrow="Actividad" title="Ultimas valoraciones" />
        <button type="button" className="text-xs font-semibold text-muted-foreground">Ver todas</button>
      </div>
      <div className="space-y-3">
        {athletes.slice(0, 3).map((athlete) => (
          <div key={athlete.id} className="flex items-center gap-3 rounded-md border border-border bg-background/35 p-3">
            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{athlete.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(athlete.assessments[0].date)}</p>
            </div>
            <span className="tabular text-lg font-bold text-brand">{athlete.assessments[0].score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ values, height = 52, invert = false }: { values: number[]; height?: number; invert?: boolean }) {
  const width = 190;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) => pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
  const y = (value: number) => {
    const pct = (value - min) / span;
    const mapped = invert ? pct : 1 - pct;
    return pad + mapped * (height - pad * 2);
  };
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
      <polygon points={area} fill="hsl(var(--brand) / 0.12)" />
      <polyline points={points} fill="none" stroke="hsl(var(--brand))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => (
        <circle key={`${value}-${index}`} cx={x(index)} cy={y(value)} r="2" fill="hsl(var(--brand))" />
      ))}
    </svg>
  );
}

function DashboardMetric({
  label,
  value,
  suffix,
  footer,
  delta,
  icon: Icon,
  series,
  invertSeries,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  footer: string;
  delta: string;
  icon: typeof UsersRound;
  series: number[];
  invertSeries?: boolean;
}) {
  return (
    <div className="surface-1 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <Icon className="size-4 text-brand/70" />
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="tabular text-3xl font-bold">{value}</span>
        {suffix ? <span className="text-sm font-semibold text-muted-foreground">{suffix}</span> : null}
      </div>
      <div className="mt-3">
        <MiniSparkline values={series} invert={invertSeries} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{footer}</span>
        <span className="rounded-sm bg-brand/12 px-2 py-1 text-xs font-bold text-brand">{delta}</span>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, suffix, icon: Icon }: { label: string; value: string | number; suffix?: string; icon: typeof ShieldCheck }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <Icon className="size-5 text-brand" />
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-bold">
        {value}
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </p>
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-sm bg-background/45 px-2 py-2">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">
        {value}
        {unit ? <span className="ml-1 text-[11px] text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
    </div>
  );
}

type NewAthleteFormData = {
  name: string;
  document: string;
  birthDate: string;
  sex: 'M' | 'F';
  category: string;
  group: string;
  sport: string;
  position: string;
  photoUrl?: string;
  photoFile?: File | null;
};

function PhotoCaptureControls({
  onPhoto,
  onFileName,
  onFile,
  compact = false,
}: {
  onPhoto: (photoUrl: string) => void;
  onFileName?: (fileName: string) => void;
  onFile?: (file: File) => void;
  compact?: boolean;
}) {
  function handleFile(file: File | undefined) {
    if (!file) return;
    onFileName?.(file.name);
    onFile?.(file);
    onPhoto(URL.createObjectURL(file));
  }

  const controlClass = compact
    ? 'flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border bg-background/70 px-2 text-[11px] font-bold text-foreground transition hover:border-brand/50'
    : 'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background/70 px-3 text-sm font-bold text-foreground transition hover:border-brand/50';

  return (
    <div className={compact ? 'mt-3 grid w-full gap-2' : 'mt-4 grid w-full gap-2'}>
      <label className={controlClass}>
        <Upload className={compact ? 'size-3.5' : 'size-4'} />
        Subir foto
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>
      <label className={controlClass}>
        <Camera className={compact ? 'size-3.5' : 'size-4'} />
        Tomar foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>
    </div>
  );
}

function CreateAthleteModal({
  settings,
  initial,
  title = 'Nuevo deportista',
  submitLabel = 'Crear y valorar',
  onClose,
  onCreate,
}: {
  settings: ProductSettings;
  initial?: Athlete;
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onCreate: (data: NewAthleteFormData) => void;
}) {
  const [form, setForm] = useState<NewAthleteFormData>({
    name: initial?.name ?? '',
    document: initial?.document ?? '',
    birthDate: initial?.birthDate ?? '2011-01-01',
    sex: initial?.sex ?? 'M',
    category: initial?.category || settings.categories[0] || 'Personalizado',
    group: initial?.group || settings.groups[0] || 'General',
    sport: initial?.sport || settings.sports[0] || 'General',
    position: initial?.position || settings.positions[0] || 'General',
    photoUrl: initial?.photoUrl,
  });
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canCreate = form.name.trim().length > 2 && form.document.trim().length > 4;

  function update<K extends keyof NewAthleteFormData>(key: K, value: NewAthleteFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!canCreate || submitting) return;
    setSubmitting(true);
    await onCreate(form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
      <section className="surface-2 max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-lg p-4 shadow-float md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{title}</p>
            <h2 className="mt-1 text-2xl font-semibold">Datos basicos y categoria</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {initial ? 'Actualiza los datos del deportista.' : 'Al guardar se genera un código único de 8 dígitos.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-md border border-border text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div className="rounded-lg border border-dashed border-brand/40 bg-brand/5 p-4 text-center">
            <div className="mx-auto grid size-28 place-items-center overflow-hidden rounded-md bg-background/50 ring-1 ring-brand/30">
              {form.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photoUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="size-9 text-brand" />
              )}
            </div>
            <span className="mt-3 block text-sm font-semibold text-foreground">Foto del deportista</span>
            <span className="mt-1 block max-w-[140px] truncate text-xs text-muted-foreground">{fileName || 'Storage simulado'}</span>
            <PhotoCaptureControls
              onFileName={setFileName}
              onPhoto={(photoUrl) => update('photoUrl', photoUrl)}
              onFile={(file) => update('photoFile', file)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre del deportista">
              <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. Daniel Pena" className="field-control" />
            </FormField>
            <FormField label="Documento de identidad">
              <input value={form.document} onChange={(event) => update('document', event.target.value)} placeholder="Ej. 1114572691" className="field-control" />
            </FormField>
            <FormField label="Fecha de nacimiento">
              <input type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} className="field-control" />
            </FormField>
            <FormField label="Sexo">
              <select value={form.sex} onChange={(event) => update('sex', event.target.value as 'M' | 'F')} className="field-control">
                <option className="bg-surface" value="M">Masculino</option>
                <option className="bg-surface" value="F">Femenino</option>
              </select>
            </FormField>
            <FormField label="Categoria">
              <select value={form.category} onChange={(event) => update('category', event.target.value)} className="field-control">
                {settings.categories.map((item) => <option key={item} className="bg-surface">{item}</option>)}
              </select>
            </FormField>
            <FormField label="Grupo">
              <select value={form.group} onChange={(event) => update('group', event.target.value)} className="field-control">
                {settings.groups.map((item) => <option key={item} className="bg-surface">{item}</option>)}
              </select>
            </FormField>
            <FormField label="Deporte">
              <select value={form.sport} onChange={(event) => update('sport', event.target.value)} className="field-control">
                {settings.sports.map((item) => <option key={item} className="bg-surface">{item}</option>)}
              </select>
            </FormField>
            <FormField label="Perfil / posicion">
              <select value={form.position} onChange={(event) => update('position', event.target.value)} className="field-control">
                {settings.positions.map((item) => <option key={item} className="bg-surface">{item}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={!canCreate || submitting}>
            <Plus />
            {submitting ? 'Guardando…' : submitLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function SettingsView({
  settings,
  onReload,
  fichaTheme,
  onFichaTheme,
  sampleFichaId,
}: {
  settings: ProductSettings;
  onReload: () => Promise<void>;
  fichaTheme: FichaTheme;
  onFichaTheme: (theme: FichaTheme) => Promise<void>;
  sampleFichaId?: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="surface-1 rounded-lg p-4 md:p-5">
        <SectionHeader eyebrow="Apariencia" title="Tema de la ficha" />
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">
          Elige cómo se ve la ficha pública del deportista (y su PDF): clara u oscura.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onFichaTheme(t)}
                className={`h-10 rounded-sm px-4 text-sm font-semibold transition ${
                  fichaTheme === t ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'light' ? 'Clara' : 'Oscura'}
              </button>
            ))}
          </div>
          {sampleFichaId ? (
            <>
              <a href={`/ficha/${sampleFichaId}?theme=${fichaTheme}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">
                Previsualizar ficha ↗
              </a>
              <span className="text-xs text-muted-foreground">Se aplica a lo que ve el deportista.</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Crea una ficha para previsualizar.</span>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsList title="Categorías" description="Tipos de atención del deportista." kind="category" values={settings.categories} onReload={onReload} />
        <SettingsList title="Grupos" description="Equipos o cohortes (ej. Running, Cofisam)." kind="group" values={settings.groups} onReload={onReload} />
        <SettingsList title="Deportes" description="Opciones del perfil del deportista." kind="sport" values={settings.sports} onReload={onReload} />
        <SettingsList title="Perfiles / posiciones" description="Rol deportivo o enfoque de entrenamiento." kind="position" values={settings.positions} onReload={onReload} />
      </div>
    </div>
  );
}

function SettingsList({
  title,
  description,
  kind,
  values,
  onReload,
}: {
  title: string;
  description: string;
  kind: CatalogKind;
  values: string[];
  onReload: () => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(op: Promise<unknown>) {
    setBusy(true);
    try {
      await op;
      await onReload();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const next = draft.trim();
    if (!next || busy) return;
    setDraft('');
    await run(api.addCatalogItem(kind, next));
  }

  return (
    <section className="surface-1 rounded-lg p-4 md:p-5">
      <SectionHeader eyebrow="Editable" title={title} />
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-2">
        {values.map((value) => (
          <CatalogRow
            key={value}
            value={value}
            disabled={busy}
            onRename={(newLabel) => run(api.renameCatalogItem(kind, value, newLabel))}
            onDelete={() => run(api.deleteCatalogItem(kind, value))}
          />
        ))}
        {values.length === 0 ? <p className="text-sm text-muted-foreground">Sin opciones aún.</p> : null}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
          placeholder="Nueva opción"
          className="field-control"
        />
        <Button type="button" variant="outline" onClick={add} disabled={busy}>
          <Plus />
          Agregar
        </Button>
      </div>
    </section>
  );
}

function CatalogRow({
  value,
  disabled,
  onRename,
  onDelete,
}: {
  value: string;
  disabled: boolean;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-background/35 px-3">
      <input
        value={local}
        disabled={disabled}
        onChange={(event) => setLocal(event.target.value)}
        onBlur={() => {
          const clean = local.trim();
          if (clean && clean !== value) onRename(clean);
          else setLocal(value);
        }}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="grid size-9 place-items-center rounded-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string; size?: 'md' | 'lg' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl ?? defaultAthletePhoto}
      alt={name}
      className={`${size === 'lg' ? 'size-16' : 'size-12'} shrink-0 rounded-md object-cover ring-1 ring-brand/20`}
    />
  );
}

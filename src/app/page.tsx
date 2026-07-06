'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
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

const viewItems: Array<{ id: ViewId; label: string; icon: typeof UsersRound }> = [
  { id: 'athletes', label: 'Deportistas', icon: UsersRound },
  { id: 'assessment', label: 'Valoracion', icon: ClipboardList },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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

type AssessmentDraft = {
  fat: string;
  restingHr: string;
  sitReach: string;
  cmj: string;
  weight: string;
  height: string;
  speed10m: string;
  squat1rm: string;
  vo2: string;
  notes: string;
};

const toNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalize = (value: number | null, min: number, max: number) =>
  value == null ? 0 : clampScore(((value - min) / (max - min)) * 100);
const normalizeSpeed = (seconds: number | null) =>
  seconds == null || seconds <= 0 ? 0 : clampScore(((2.4 - seconds) / (2.4 - 1.5)) * 100);
const kmhFrom10m = (seconds: number | null) => (seconds == null || seconds <= 0 ? null : (10 / seconds) * 3.6);
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
const biologicalAge = (sex: Athlete['sex'], birthDate: string, assessmentDate: string, heightCm: number | null) => {
  const ageDecimal = yearsBetween(birthDate, assessmentDate);
  if (ageDecimal == null || heightCm == null || heightCm <= 0) return null;
  const ageHeight = ageDecimal * heightCm;
  const offset = sex === 'M'
    ? -7.999994 + 0.0036124 * ageHeight
    : -7.709133 + 0.0042232 * ageHeight;
  const peakHeightVelocity = sex === 'M' ? 13.8 : 12.0;
  return peakHeightVelocity + offset;
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
  const [view, setView] = useState<ViewId>('athletes');
  const [mockAthletes, setMockAthletes] = useState<Athlete[]>(initialAthletes);
  const [settings, setSettings] = useState<ProductSettings>(defaultSettings);
  const [selectedId, setSelectedId] = useState(initialAthletes[0].id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [publicPreview, setPublicPreview] = useState(true);
  const [publicAssessment, setPublicAssessment] = useState<Assessment | null>(null);

  const selected = mockAthletes.find((athlete) => athlete.id === selectedId) ?? mockAthletes[0];
  const currentAssessment = selected.assessments[0];
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

  function createAthlete(data: NewAthleteFormData) {
    const athlete: Athlete = {
      id: `${Date.now()}`,
      name: data.name.trim(),
      document: data.document.trim(),
      birthDate: data.birthDate,
      sex: data.sex,
      code: generateCode(),
      category: data.category,
      group: data.group,
      sport: data.sport,
      position: data.position,
      photoUrl: data.photoUrl,
      status: 'warning',
      statusLabel: 'Nuevo',
      assessments: [emptyAssessment()],
    };
    setMockAthletes((current) => [athlete, ...current]);
    setSelectedId(athlete.id);
    setPublicAssessment(null);
    setIsCreateOpen(false);
    setView('assessment');
    setPublicPreview(false);
  }

  function updateAthletePhoto(athleteId: string, photoUrl: string) {
    setMockAthletes((current) =>
      current.map((athlete) => (athlete.id === athleteId ? { ...athlete, photoUrl } : athlete)),
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_18%_0%,hsl(var(--brand)/0.10),transparent_28%),radial-gradient(circle_at_90%_12%,hsl(var(--level-elite)/0.08),transparent_26%),hsl(var(--background))] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col xl:flex-row">
        {isAdmin ? (
        <aside className="hidden w-[236px] shrink-0 border-r border-border bg-surface/80 px-4 py-5 xl:flex xl:flex-col">
          <BrandBlock />
          <NavRail current={view} onChange={(nextView) => {
            setPublicPreview(false);
            setView(nextView);
          }} />
          <div className="mt-auto rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">MVP mock</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Vistas navegables con datos locales para aprobacion de producto.
            </p>
          </div>
        </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/92 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
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
                        : 'Settings del mock'}
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
                <Button
                  size="sm"
                  variant={isAdmin ? 'outline' : 'brand'}
                  onClick={() => {
                    if (isAdmin) {
                      setIsAdmin(false);
                      setPublicPreview(true);
                    } else {
                      setIsAdmin(true);
                      setPublicPreview(false);
                      setView('assessment');
                    }
                  }}
                >
                  {isAdmin ? <LogOut /> : <LogIn />}
                  {isAdmin ? 'Cerrar sesion' : 'Ingresar como admin'}
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

          <main className="flex-1 px-4 py-4 pb-[calc(var(--safe-bottom)+5.5rem)] md:px-6 md:py-6 lg:px-8 xl:pb-8">
            {isPublicView ? (
              <PublicAssessmentView athlete={selected} assessmentOverride={publicAssessment} />
            ) : view === 'athletes' ? (
              <AthletesView
                athletes={filteredAthletes}
                selected={selected}
                categoryOptions={categoryOptions}
                query={query}
                category={category}
                onQuery={setQuery}
                onCategory={setCategory}
                onCreate={() => setIsCreateOpen(true)}
                onSelect={(athlete) => {
                  setSelectedId(athlete.id);
                  setPublicAssessment(null);
                  setView('assessment');
                }}
              />
            ) : view === 'assessment' ? (
              <AssessmentView
                athlete={selected}
                isAdmin={isAdmin}
                onPhotoChange={(photoUrl) => updateAthletePhoto(selected.id, photoUrl)}
                onPreviewPublic={(nextAssessment) => {
                  setPublicAssessment(nextAssessment);
                  setPublicPreview(true);
                }}
              />
            ) : view === 'dashboard' ? (
              <DashboardView athletes={mockAthletes} />
            ) : view === 'settings' ? (
              <SettingsView settings={settings} onChange={setSettings} />
            ) : null}
          </main>

          {isAdmin ? (
          <nav className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-4 gap-2 rounded-[999px] border border-white/10 bg-surface/90 p-2 shadow-float backdrop-blur xl:hidden">
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
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="mb-8 px-2">
      <div>
        <p className="text-2xl font-bold uppercase tracking-[-0.04em] leading-none">
          <span className="text-brand">IN</span>MOVE
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Centro de evaluacion y rendimiento</p>
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
      <button
        type="button"
        onClick={() => onChange('dashboard')}
        className={`flex h-12 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${
          current === 'dashboard' ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        }`}
      >
        <Home className="size-5" />
        Panel
      </button>
      {viewItems.map((item) => {
        if (item.id === 'dashboard') return null;
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
          <div key={item.label} className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground/75">
            <Icon className="size-5" />
            {item.label}
          </div>
        );
      })}
    </nav>
  );
}

function AthletesView({
  athletes: visibleAthletes,
  selected,
  categoryOptions,
  query,
  category,
  onQuery,
  onCategory,
  onCreate,
  onSelect,
}: {
  athletes: Athlete[];
  selected: Athlete;
  categoryOptions: string[];
  query: string;
  category: string;
  onQuery: (query: string) => void;
  onCategory: (category: string) => void;
  onCreate: () => void;
  onSelect: (athlete: Athlete) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="surface-1 rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{visibleAthletes.length} deportistas visibles</p>
            <h2 className="text-xl font-semibold">Selecciona un atleta para valorar</h2>
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

        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visibleAthletes.map((athlete) => (
            <AthleteListCard key={athlete.id} athlete={athlete} selected={athlete.id === selected.id} onClick={() => onSelect(athlete)} />
          ))}
        </div>
      </section>

      <SelectedAthletePanel athlete={selected} />
    </div>
  );
}

function AthleteListCard({ athlete, selected, onClick }: { athlete: Athlete; selected: boolean; onClick: () => void }) {
  const assessment = athlete.assessments[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`surface-1 border-t-4 ${levelBorder[athlete.status]} min-h-[164px] rounded-lg p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/60 ${
        selected ? 'ring-2 ring-brand/60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-base font-semibold">{athlete.name}</p>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{athlete.category} · {athlete.sport} · {athlete.position}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-brand/10 px-2 py-1 font-mono text-xs tracking-[0.18em] text-brand">{athlete.code}</span>
            <StatusBadge level={athlete.status} label={athlete.statusLabel} size="sm" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Score" value={assessment.score} />
        <MiniStat label="Categoria" value={athlete.category} />
        <MiniStat label="CMJ" value={assessment.metrics.find((metric) => metric.label === 'CMJ')?.value ?? '-'} unit="cm" />
      </div>
    </button>
  );
}

function SelectedAthletePanel({ athlete }: { athlete: Athlete }) {
  const assessment = athlete.assessments[0];
  return (
    <aside className="surface-1 rounded-lg p-5 lg:sticky lg:top-[116px] lg:self-start">
      <div className="flex items-start gap-4">
        <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{athlete.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{athlete.category} · {athlete.group} · {athlete.sport}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge level={athlete.status} label={athlete.statusLabel} />
            <span className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              Codigo {athlete.code}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <SummaryTile label="Score actual" value={assessment.score} suffix="/100" icon={ShieldCheck} />
        <SummaryTile label="Valoracion" value={formatDate(assessment.date)} icon={CalendarDays} />
      </div>

      <div className="mt-5">
        <RadarChart data={assessment.radar} compact />
      </div>
    </aside>
  );
}

function AssessmentView({
  athlete,
  isAdmin,
  onPhotoChange,
  onPreviewPublic,
}: {
  athlete: Athlete;
  isAdmin: boolean;
  onPhotoChange: (photoUrl: string) => void;
  onPreviewPublic: (assessment: Assessment) => void;
}) {
  const assessment = athlete.assessments[0];
  const [draft, setDraft] = useState<AssessmentDraft>({
    fat: String(assessment.metrics[0]?.value || ''),
    restingHr: String(assessment.metrics[1]?.value || ''),
    sitReach: String(assessment.metrics[2]?.value || ''),
    cmj: String(assessment.metrics[3]?.value || ''),
    weight: '57.4',
    height: '162',
    speed10m: athlete.id === 'samuel' ? '1.95' : '1.9',
    squat1rm: assessment.radar[0]?.raw.replace(/[^\d.]/g, '') || '',
    vo2: assessment.radar[2]?.raw.replace(/[^\d.]/g, '') || '',
    notes: '',
  });
  const updateDraft = (key: keyof AssessmentDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const fatValue = toNumber(draft.fat);
  const restingHrValue = toNumber(draft.restingHr);
  const sitReachValue = toNumber(draft.sitReach);
  const cmjValue = toNumber(draft.cmj);
  const weightValue = toNumber(draft.weight);
  const heightValue = toNumber(draft.height);
  const speed10mValue = toNumber(draft.speed10m);
  const squatValue = toNumber(draft.squat1rm);
  const vo2Value = toNumber(draft.vo2);
  const kmh = kmhFrom10m(speed10mValue);
  const age = chronologicalAge(athlete.birthDate, assessment.date);
  const bioAge = biologicalAge(athlete.sex, athlete.birthDate, assessment.date, heightValue);
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
    { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: normalizeSpeed(speed10mValue), team: 68, raw: kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`, source: 'Sprint 10 m' },
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
      chronologicalAge: age,
      biologicalAge: bioAge,
      speed10m: speed10mValue,
      squat1rm: squatValue,
      vo2: vo2Value,
      notes: draft.notes.trim(),
    },
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(380px,0.98fr)]">
      <section className="surface-1 rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">Ficha activa</p>
            <h2 className="text-2xl font-semibold">{athlete.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {athlete.code} · {athlete.group} · {formatDate(assessment.date)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={!isAdmin}>
              <Check />
              Guardar valoracion
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
              <input readOnly value={bioAge == null ? 'Falta estatura' : `${bioAge.toFixed(1)} años`} className="field-control" />
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric label="% Grasa corporal" value={fatValue ?? '—'} suffix="%" footer={fatStatus.label} delta="en vivo" icon={Gauge} series={[...metricSeries.fat]} />
          <DashboardMetric label="FC en reposo" value={restingHrValue ?? '—'} suffix="ppm" footer={hrStatus.label} delta="en vivo" icon={HeartPulse} series={[...metricSeries.heart]} />
          <DashboardMetric label="CMJ (salto)" value={cmjValue ?? '—'} suffix="cm" footer={cmjStatus.label} delta="en vivo" icon={Activity} series={[...metricSeries.jump]} />
          <DashboardMetric label="Sprint 10 m" value={speed10mValue ?? '—'} suffix="s" footer={kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`} delta="en vivo" icon={Flame} series={[...metricSeries.sprint]} invertSeries />
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
          {displayMetrics.map((metric) => (
            <MetricInputCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FormField label="Peso (kg)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.weight} onChange={(event) => updateDraft('weight', event.target.value)} placeholder="57.4" className="field-control" />
          </FormField>
          <FormField label="Estatura (cm)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.height} onChange={(event) => updateDraft('height', event.target.value)} placeholder="162" className="field-control" />
          </FormField>
          <FormField label="Velocidad 10 m (s)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.speed10m} onChange={(event) => updateDraft('speed10m', event.target.value)} placeholder="1.90" className="field-control" />
          </FormField>
          <FormField label="Sentadilla 1RM (kg)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.squat1rm} onChange={(event) => updateDraft('squat1rm', event.target.value)} placeholder="95" className="field-control" />
          </FormField>
          <FormField label="Resistencia VO2max (ml/kg)">
            <input disabled={!isAdmin} inputMode="decimal" value={draft.vo2} onChange={(event) => updateDraft('vo2', event.target.value)} placeholder="52" className="field-control" />
          </FormField>
          <FormField label="Observaciones">
            <input disabled={!isAdmin} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Notas de la valoracion" className="field-control" />
          </FormField>
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
  const profile = {
    weight: assessment.profile?.weight ?? bodyProfile.weight,
    height: assessment.profile?.height ?? bodyProfile.height,
    chronologicalAge: assessment.profile?.chronologicalAge ?? chronologicalAge(athlete.birthDate, assessment.date),
    biologicalAge:
      assessment.profile?.biologicalAge ??
      biologicalAge(athlete.sex, athlete.birthDate, assessment.date, assessment.profile?.height ?? bodyProfile.height),
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
  const size = compact ? 260 : 360;
  const center = size / 2;
  const radius = compact ? 86 : 124;
  const angles = [-90, 0, 90, 180].map((angle) => (angle * Math.PI) / 180);
  const point = (index: number, value: number) => {
    const r = (radius * value) / 100;
    return [center + r * Math.cos(angles[index]), center + r * Math.sin(angles[index])] as const;
  };
  const polygon = (key: 'score' | 'team') => data.map((metric, index) => point(index, metric[key]).join(',')).join(' ');

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar de rendimiento del atleta" className="h-auto w-full">
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
                {compact ? metric.shortLabel : metric.label}
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
};

function PhotoCaptureControls({
  onPhoto,
  onFileName,
  compact = false,
}: {
  onPhoto: (photoUrl: string) => void;
  onFileName?: (fileName: string) => void;
  compact?: boolean;
}) {
  function handleFile(file: File | undefined) {
    if (!file) return;
    onFileName?.(file.name);
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
  onClose,
  onCreate,
}: {
  settings: ProductSettings;
  onClose: () => void;
  onCreate: (data: NewAthleteFormData) => void;
}) {
  const [form, setForm] = useState<NewAthleteFormData>({
    name: '',
    document: '',
    birthDate: '2011-01-01',
    sex: 'M',
    category: settings.categories[0] ?? 'Personalizado',
    group: settings.groups[0] ?? 'General',
    sport: settings.sports[0] ?? 'General',
    position: settings.positions[0] ?? 'General',
  });
  const [fileName, setFileName] = useState('');
  const canCreate = form.name.trim().length > 2 && form.document.trim().length > 4;

  function update<K extends keyof NewAthleteFormData>(key: K, value: NewAthleteFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (!canCreate) return;
    onCreate(form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
      <section className="surface-2 max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-lg p-4 shadow-float md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Nuevo deportista</p>
            <h2 className="mt-1 text-2xl font-semibold">Datos basicos y categoria</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mock funcional: al guardar se genera codigo de 8 digitos y queda listo para valorar.
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
          <Button type="button" onClick={submit} disabled={!canCreate}>
            <Plus />
            Crear y valorar
          </Button>
        </div>
      </section>
    </div>
  );
}

function SettingsView({ settings, onChange }: { settings: ProductSettings; onChange: (settings: ProductSettings) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingsList title="Categorias de atencion" description="Segmenta el listado y el flujo comercial." field="categories" values={settings.categories} settings={settings} onChange={onChange} />
      <SettingsList title="Grupos" description="Equipos o cohortes para reportes." field="groups" values={settings.groups} settings={settings} onChange={onChange} />
      <SettingsList title="Deportes" description="Opciones del perfil del deportista." field="sports" values={settings.sports} settings={settings} onChange={onChange} />
      <SettingsList title="Perfiles / posiciones" description="Rol deportivo o enfoque de entrenamiento." field="positions" values={settings.positions} settings={settings} onChange={onChange} />
    </div>
  );
}

function SettingsList({
  title,
  description,
  field,
  values,
  settings,
  onChange,
}: {
  title: string;
  description: string;
  field: keyof ProductSettings;
  values: string[];
  settings: ProductSettings;
  onChange: (settings: ProductSettings) => void;
}) {
  const [draft, setDraft] = useState('');
  const updateValues = (next: string[]) => onChange({ ...settings, [field]: next });

  return (
    <section className="surface-1 rounded-lg p-4 md:p-5">
      <SectionHeader eyebrow="Editable" title={title} />
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-background/35 px-3">
            <input
              value={value}
              onChange={(event) => updateValues(values.map((item, i) => (i === index ? event.target.value : item)))}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            />
            <button
              type="button"
              onClick={() => updateValues(values.filter((_, i) => i !== index))}
              className="grid size-9 place-items-center rounded-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nueva opcion"
          className="field-control"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const next = draft.trim();
            if (!next) return;
            updateValues([...values, next]);
            setDraft('');
          }}
        >
          <Plus />
          Agregar
        </Button>
      </div>
    </section>
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

import type { Level } from '@/styles/tokens';
import type { Anthropometry, Cardio, Rom, Flexibility, Performance } from '@/lib/ficha';

export type ViewId = 'athletes' | 'assessment' | 'dashboard' | 'settings';

export type RadarKey = 'strength' | 'speed' | 'endurance' | 'jump';

export type RadarMetric = {
  key: RadarKey;
  label: string;
  shortLabel: string;
  score: number;
  team: number;
  raw: string;
  source: string;
};

export type ScaleMetric = {
  label: string;
  value: number;
  unit: string;
  level: Level;
  levelLabel: string;
  range: string;
};

export type Assessment = {
  id?: string;
  date: string;
  score: number;
  radar: RadarMetric[];
  metrics: ScaleMetric[];
  profile?: {
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    chronologicalAge?: number | null;
    biologicalAge?: number | null;
    speed10m?: number | null;
    squat1rm?: number | null;
    vo2?: number | null;
    notes?: string;
  };
  // Medidas crudas por dominio (para repoblar el formulario completo al editar).
  raw?: {
    anthropometry?: Anthropometry | null;
    cardio?: Cardio | null;
    rom?: Rom | null;
    flexibility?: Flexibility | null;
    performance?: Performance | null;
    plan?: string | null;
  };
};

export type Athlete = {
  id: string;
  name: string;
  code: string;
  document: string;
  birthDate: string;
  sex: 'M' | 'F';
  category: string;
  group: string;
  sport: string;
  position: string;
  photoUrl?: string;
  status: Level;
  statusLabel: string;
  assessments: Assessment[];
};

export type ProductSettings = {
  categories: string[];
  groups: string[];
  sports: string[];
  positions: string[];
};

export const defaultSettings: ProductSettings = {
  categories: ['Personalizado', 'Semi personalizado', 'Grupos', 'Otros'],
  groups: ['Running', 'Cofisam', 'Juvenil', 'Libre'],
  sports: ['Atletismo', 'Futbol', 'Triatlon', 'Funcional'],
  positions: ['Velocidad', 'Fondo', 'Volante', 'Extremo', 'General'],
};

export const athletes: Athlete[] = [
  {
    id: 'daniel',
    name: 'Daniel Pena',
    code: '48276105',
    document: '1114572691',
    birthDate: '2011-04-29',
    sex: 'M',
    category: 'Personalizado',
    group: 'Running',
    sport: 'Atletismo',
    position: 'Velocidad',
    status: 'good',
    statusLabel: 'Optimo',
    assessments: [
      {
        date: '2026-07-15',
        score: 78,
        radar: [
          { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: 82, team: 70, raw: '95 kg', source: 'Sentadilla 1RM' },
          { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: 74, team: 68, raw: '27.4 km/h', source: 'Sprint 10 m' },
          { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: 63, team: 66, raw: '52 ml/kg', source: 'VO2max' },
          { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: 78, team: 61, raw: '42 cm', source: 'CMJ' },
        ],
        metrics: [
          { label: 'Grasa corporal', value: 14, unit: '%', level: 'good', levelLabel: 'Optimo', range: '10-16 %' },
          { label: 'FC reposo', value: 58, unit: 'ppm', level: 'good', levelLabel: 'Optimo', range: '50-62 ppm' },
          { label: 'Sit and reach', value: 30, unit: 'cm', level: 'elite', levelLabel: 'Atleta', range: '>= 28 cm' },
          { label: 'CMJ', value: 42, unit: 'cm', level: 'good', levelLabel: 'Optimo', range: '38-46 cm' },
        ],
      },
    ],
  },
  {
    id: 'samuel',
    name: 'Samuel Bustos',
    code: '71903355',
    document: '1077867547',
    birthDate: '2012-02-16',
    sex: 'M',
    category: 'Semi personalizado',
    group: 'Running',
    sport: 'Atletismo',
    position: 'Fondo',
    status: 'warning',
    statusLabel: 'Seguimiento',
    assessments: [
      {
        date: '2026-05-01',
        score: 66,
        radar: [
          { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: 66, team: 70, raw: '78 kg', source: 'Sentadilla 1RM' },
          { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: 68, team: 68, raw: '25.8 km/h', source: 'Sprint 10 m' },
          { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: 67, team: 66, raw: '54 ml/kg', source: 'VO2max' },
          { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: 63, team: 61, raw: '35 cm', source: 'CMJ' },
        ],
        metrics: [
          { label: 'Grasa corporal', value: 16, unit: '%', level: 'warning', levelLabel: 'Medio', range: '16-20 %' },
          { label: 'FC reposo', value: 66, unit: 'ppm', level: 'warning', levelLabel: 'Medio', range: '63-70 ppm' },
          { label: 'Sit and reach', value: 25, unit: 'cm', level: 'good', levelLabel: 'Optimo', range: '22-27 cm' },
          { label: 'CMJ', value: 35, unit: 'cm', level: 'warning', levelLabel: 'Medio', range: '32-38 cm' },
        ],
      },
    ],
  },
  {
    id: 'maria',
    name: 'Maria Jose Rios',
    code: '30514882',
    document: '1099220145',
    birthDate: '2010-09-08',
    sex: 'F',
    category: 'Grupos',
    group: 'Cofisam',
    sport: 'Futbol',
    position: 'Volante',
    status: 'elite',
    statusLabel: 'Atleta',
    assessments: [
      {
        date: '2026-07-20',
        score: 72,
        radar: [
          { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: 68, team: 62, raw: '64 kg', source: 'Sentadilla 1RM' },
          { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: 69, team: 64, raw: '25.1 km/h', source: 'Sprint 10 m' },
          { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: 78, team: 70, raw: '49 ml/kg', source: 'VO2max' },
          { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: 72, team: 60, raw: '33 cm', source: 'CMJ' },
        ],
        metrics: [
          { label: 'Grasa corporal', value: 21, unit: '%', level: 'good', levelLabel: 'Optimo', range: '18-23 %' },
          { label: 'FC reposo', value: 60, unit: 'ppm', level: 'good', levelLabel: 'Optimo', range: '52-64 ppm' },
          { label: 'Sit and reach', value: 36, unit: 'cm', level: 'elite', levelLabel: 'Atleta', range: '>= 34 cm' },
          { label: 'CMJ', value: 33, unit: 'cm', level: 'good', levelLabel: 'Optimo', range: '30-36 cm' },
        ],
      },
    ],
  },
  {
    id: 'juan',
    name: 'Juan Pablo Hamon',
    code: '66271408',
    document: '1085330912',
    birthDate: '2009-03-08',
    sex: 'M',
    category: 'Grupos',
    group: 'Cofisam',
    sport: 'Futbol',
    position: 'Extremo',
    status: 'elite',
    statusLabel: 'Atleta',
    assessments: [
      {
        date: '2026-06-05',
        score: 79,
        radar: [
          { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: 84, team: 70, raw: '101 kg', source: 'Sentadilla 1RM' },
          { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: 83, team: 68, raw: '29.2 km/h', source: 'Sprint 10 m' },
          { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: 64, team: 66, raw: '53 ml/kg', source: 'VO2max' },
          { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: 79, team: 61, raw: '45 cm', source: 'CMJ' },
        ],
        metrics: [
          { label: 'Grasa corporal', value: 12, unit: '%', level: 'elite', levelLabel: 'Atleta', range: '8-13 %' },
          { label: 'FC reposo', value: 54, unit: 'ppm', level: 'elite', levelLabel: 'Atleta', range: '<= 55 ppm' },
          { label: 'Sit and reach', value: 27, unit: 'cm', level: 'good', levelLabel: 'Optimo', range: '24-30 cm' },
          { label: 'CMJ', value: 45, unit: 'cm', level: 'elite', levelLabel: 'Atleta', range: '>= 44 cm' },
        ],
      },
    ],
  },
];

export const groups = ['Todos', 'Running', 'Cofisam'] as const;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const generateCode = () =>
  Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');

export const emptyAssessment = (date = todayIso()): Assessment => ({
  date,
  score: 0,
  radar: [
    { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: 0, team: 70, raw: 'Sin dato', source: 'Sentadilla 1RM' },
    { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: 0, team: 68, raw: 'Sin dato', source: 'Sprint 10 m' },
    { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: 0, team: 66, raw: 'Sin dato', source: 'VO2max' },
    { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: 0, team: 61, raw: 'Sin dato', source: 'CMJ' },
  ],
  metrics: [
    { label: 'Grasa corporal', value: 0, unit: '%', level: 'warning', levelLabel: 'Sin dato', range: 'Pendiente' },
    { label: 'FC reposo', value: 0, unit: 'ppm', level: 'warning', levelLabel: 'Sin dato', range: 'Pendiente' },
    { label: 'Sit and reach', value: 0, unit: 'cm', level: 'warning', levelLabel: 'Sin dato', range: 'Pendiente' },
    { label: 'CMJ', value: 0, unit: 'cm', level: 'warning', levelLabel: 'Sin dato', range: 'Pendiente' },
  ],
});

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );

export const levelLabel: Record<Level, string> = {
  danger: 'Bajo',
  warning: 'Medio',
  good: 'Optimo',
  elite: 'Atleta',
};

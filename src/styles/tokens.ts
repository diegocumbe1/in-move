/**
 * ============================================================================
 * IN MOVE — DESIGN TOKENS (fuente única de verdad, en TypeScript)
 * ============================================================================
 *
 * Este archivo es la referencia canónica de TODO el lenguaje visual del
 * producto: color de marca, semáforo, glass, radios, blur, sombras, espaciado,
 * tamaños táctiles y tipografía.
 *
 * ¿Cómo funciona el "cambio en un solo lugar"?
 *  - Los COLORES viven como variables CSS en `globals.css` (bloque `:root`),
 *    porque Tailwind y shadcn/ui los consumen en runtime vía `hsl(var(--x))`.
 *    Este objeto los mapea a nombres tipados para usarlos desde JS/TS
 *    (gráficos Recharts, animaciones, canvas, etc.).
 *  - Los ESCALARES (radios, blur, sombras, spacing, sizes, motion) viven aquí
 *    Y en `globals.css`. Si cambias un valor, cámbialo en ambos (están anotados
 *    con el mismo nombre). Para branding rápido, tocar solo `globals.css` basta.
 *
 * Regla de oro: los componentes NUNCA usan hex sueltos. Usan clases de Tailwind
 * (`bg-brand`, `text-level-good`, `rounded-glass`…) o estas constantes.
 */

/** Helper: referencia a una variable CSS como color usable en JS (SVG, canvas, Recharts). */
export const cssVar = (name: string, alpha?: number) =>
  alpha == null ? `hsl(var(${name}))` : `hsl(var(${name}) / ${alpha})`;

/* --------------------------------------------------------------------------
 * COLOR — nombres semánticos que apuntan a las variables CSS de globals.css
 * -------------------------------------------------------------------------- */
export const color = {
  /** Fondo base de la app (teal-negro premium). */
  background: cssVar('--background'),
  /** Superficie sólida (no-glass). */
  surface: cssVar('--surface'),
  foreground: cssVar('--foreground'),
  muted: cssVar('--muted-foreground'),

  /** Marca In Move (esmeralda) — acento principal. */
  brand: cssVar('--brand'),
  brandStrong: cssVar('--brand-strong'),
  brandSoft: cssVar('--brand-soft'),

  /** Semáforo del centro. NO es el acento: comunica estado de un indicador. */
  level: {
    danger: cssVar('--level-danger'), // 🔴 bajo / riesgo
    warning: cssVar('--level-warning'), // 🟡 aceptable / promedio
    good: cssVar('--level-good'), // 🟢 bueno / óptimo
    elite: cssVar('--level-elite'), // 🔵 atleta / excelente
  },
} as const;

/** Paleta para series de gráficos (Recharts, radar ROM, barras de progreso). */
export const chartPalette = [
  cssVar('--brand'),
  cssVar('--level-elite'),
  cssVar('--level-warning'),
  cssVar('--level-danger'),
  cssVar('--chart-5'),
  cssVar('--chart-6'),
] as const;

/* --------------------------------------------------------------------------
 * RADIOS — mantener en sync con --radius-* en globals.css
 * -------------------------------------------------------------------------- */
export const radius = {
  sm: '0.5rem', // 8px  — inputs, chips
  md: '0.75rem', // 12px — botones
  lg: '1rem', // 16px — cards estándar
  glass: '1.5rem', // 24px — tarjetas glass grandes
  pill: '9999px',
} as const;

/* --------------------------------------------------------------------------
 * BLUR / GLASS — el "cristal". Mantener en sync con --blur-* y --glass-*.
 * -------------------------------------------------------------------------- */
export const glass = {
  blur: '18px', // backdrop-filter principal (cards)
  blurStrong: '28px', // headers / nav flotante
  /** Superficies translúcidas oscuras (sync con --surface-* de globals.css). */
  surface1: 'rgba(255, 255, 255, 0.04)',
  surface2: 'rgba(255, 255, 255, 0.06)',
  surface3: 'rgba(255, 255, 255, 0.08)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  hairlineStrong: 'rgba(255, 255, 255, 0.12)',
} as const;

/* --------------------------------------------------------------------------
 * SOMBRAS — profundidad elegante y oscura (sin brillos). Sync con --shadow-*.
 * -------------------------------------------------------------------------- */
export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
  card: '0 12px 32px -12px rgba(0, 0, 0, 0.6)',
  float: '0 20px 48px -16px rgba(0, 0, 0, 0.7)',
  brand: '0 8px 24px -10px hsl(var(--brand) / 0.35)',
} as const;

/* --------------------------------------------------------------------------
 * ESPACIADO base (rem). Tailwind ya trae su escala; esto documenta el ritmo.
 * -------------------------------------------------------------------------- */
export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  /** Gutter estándar del contenido en tablet. */
  gutter: '1.5rem',
} as const;

/* --------------------------------------------------------------------------
 * TAMAÑOS TÁCTILES — pensado para dedo en tablet durante una valoración.
 * -------------------------------------------------------------------------- */
export const size = {
  /** Alto mínimo táctil recomendado (Apple HIG 44pt / Material 48dp). */
  touchTarget: '3rem', // 48px
  /** Alto de los ítems del bottom nav. */
  navItem: '3.5rem',
  /** Alto cómodo de inputs en tablet (dedos, no mouse). */
  inputTablet: '3.25rem',
  inputMobile: '2.75rem',
  /** Ancho máximo del contenido central. */
  contentMax: '80rem', // 1280px
  headerHeight: '4.5rem',
  bottomNavHeight: '4.75rem',
} as const;

/* --------------------------------------------------------------------------
 * TIPOGRAFÍA — familias cargadas con next/font en layout.tsx.
 * -------------------------------------------------------------------------- */
export const font = {
  display: 'var(--font-display)', // Sora
  body: 'var(--font-body)', // Plus Jakarta Sans
  mono: 'var(--font-mono)', // JetBrains Mono (códigos, métricas)
} as const;

/* --------------------------------------------------------------------------
 * MOTION — animaciones sutiles y coherentes. Sync con globals.css.
 * -------------------------------------------------------------------------- */
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)', // easeOutExpo suave
} as const;

/** Tipo de nivel del semáforo (compartido con la capa de dominio `escalas.ts`). */
export type Level = 'danger' | 'warning' | 'good' | 'elite';

/** Mapa nivel de dominio (rojo/amarillo/verde/azul) → token semántico. */
export const LEVEL_BY_DOMAIN: Record<'rojo' | 'amarillo' | 'verde' | 'azul', Level> = {
  rojo: 'danger',
  amarillo: 'warning',
  verde: 'good',
  azul: 'elite',
};

export const tokens = { color, radius, glass, shadow, spacing, size, font, motion, chartPalette } as const;
export default tokens;

import type { MaturityMethod, MaturityPhase, MaturityReport } from '@/lib/maturity';
import { PHASE_LABEL, offsetSentence } from '@/lib/maturity';

/**
 * Panel de madurez biológica (PHV) para la ficha del deportista.
 *
 * Nota de color: se usan intensidades de un mismo tono en vez del semáforo
 * verde/ámbar/rojo del resto de la ficha. La fase de madurez NO es un resultado
 * bueno ni malo — es el punto del estirón en el que está el chico — y pintar
 * CIRCUM de rojo se leería como "está por debajo".
 */

const PHASES: MaturityPhase[] = ['pre', 'circum', 'post'];

const phaseBar: Record<MaturityPhase, string> = {
  pre: 'bg-indigo-300',
  circum: 'bg-indigo-500',
  post: 'bg-indigo-700',
};

/** Rango del eje de biobanding, en años respecto al PHV. */
const AXIS_MIN = -3;
const AXIS_MAX = 3;

function MethodCard({ method }: { method: MaturityMethod }) {
  const { label, reference, ageAtPhv, standardError, offsetYears, missing, unavailable } = method;
  const year = reference.match(/\d{4}/)?.[0];

  return (
    <div className="rounded-xl border border-[var(--fc-line-soft)] bg-[var(--fc-card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--fc-muted)]">
          {label}
          {year ? ` (${year})` : null}
        </p>
        {ageAtPhv != null && standardError != null ? (
          <span className="shrink-0 rounded-md bg-[var(--fc-band-active)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--fc-ink)]">
            ± {standardError.toFixed(2)}y
          </span>
        ) : null}
      </div>

      {ageAtPhv != null ? (
        <div className="mt-3 text-center">
          <p className="text-xs font-semibold text-[var(--fc-muted)]">Edad estimada al PHV</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-[var(--fc-ink)]">{ageAtPhv.toFixed(2)}</p>
          {standardError != null ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-[var(--fc-muted)]">
              (Rango: {(ageAtPhv - standardError).toFixed(2)} – {(ageAtPhv + standardError).toFixed(2)} años)
            </p>
          ) : null}
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
            {offsetSentence(offsetYears)}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm font-bold text-[var(--fc-muted)]">No disponible</p>
          <p className="mt-1 text-[11px] leading-tight text-[var(--fc-muted)]">
            {unavailable ?? `Falta capturar: ${missing.join(', ')}.`}
          </p>
        </div>
      )}
    </div>
  );
}

function BiobandingBar({ offsetYears, phase }: { offsetYears: number; phase: MaturityPhase }) {
  // El marcador se recorta al eje: un offset de +4 años sigue siendo POST.
  const clamped = Math.min(AXIS_MAX, Math.max(AXIS_MIN, offsetYears));
  const left = ((clamped - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100;

  return (
    <div className="mt-4">
      <p className="text-center text-xs font-semibold text-[var(--fc-muted)]">Ruta biológica (offset en años)</p>
      <div className="relative mt-6 px-1">
        <div
          className="absolute -top-5 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--fc-ink)] px-2 py-0.5 text-[10px] font-bold text-[var(--fc-card)]"
          style={{ left: `${left}%` }}
        >
          Tu atleta
        </div>
        <div
          className="absolute -top-0.5 z-10 h-5 w-0.5 -translate-x-1/2 bg-[var(--fc-ink)]"
          style={{ left: `${left}%` }}
        />
        <div className="flex gap-0.5">
          {PHASES.map((p) => (
            <div
              key={p}
              className={`h-4 flex-1 ${phaseBar[p]} ${p === phase ? '' : 'opacity-40'} ${
                p === 'pre' ? 'rounded-l-sm' : p === 'post' ? 'rounded-r-sm' : ''
              }`}
            />
          ))}
        </div>
        <div className="mt-1 flex">
          {PHASES.map((p) => (
            <div
              key={p}
              className={`flex-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                p === phase ? 'text-[var(--fc-ink)]' : 'text-[var(--fc-muted)]'
              }`}
            >
              {PHASE_LABEL[p]}
            </div>
          ))}
        </div>
        {/* El eje va de -3 a +3; las fases parten en ±1 año. */}
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--fc-muted)]">
          <span>−3</span>
          <span>−1</span>
          <span className="font-bold text-[var(--fc-ink)]">PHV</span>
          <span>+1</span>
          <span>+3</span>
        </div>
      </div>
    </div>
  );
}

export function MaturityPanel({ maturity }: { maturity: MaturityReport }) {
  const { methods, phase, referenceOffset, referenceLabel } = maturity;

  return (
    <div className="mt-5 rounded-xl border border-[var(--fc-line-soft)] bg-[var(--fc-card)] p-4">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-[var(--fc-accent)]">
        Madurez biológica · PHV
      </p>
      <p className="mt-1 text-center text-xs text-[var(--fc-muted)]">
        En qué punto del estirón puberal está, no qué tan bien rinde
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <MethodCard key={method.key} method={method} />
        ))}
      </div>

      {phase != null && referenceOffset != null ? (
        <>
          <BiobandingBar offsetYears={referenceOffset} phase={phase} />
          <p className="mt-3 text-center text-sm font-bold uppercase tracking-wide text-indigo-600">
            Fase: {PHASE_LABEL[phase]}
          </p>
          <p className="mt-0.5 text-center text-[11px] text-[var(--fc-muted)]">Basado en {referenceLabel}</p>
        </>
      ) : (
        <p className="mt-4 text-center text-xs text-[var(--fc-muted)]">
          Captura estatura, estatura sentado y peso para estimar la fase de madurez.
        </p>
      )}

      <p className="mt-4 border-t border-[var(--fc-line-soft)] pt-3 text-center text-[11px] leading-tight text-[var(--fc-muted)]">
        Ninguna fase es mejor que otra: son estimaciones estadísticas con un error de medio año o más, y sirven
        para ajustar la carga de entrenamiento, no para clasificar al deportista.
      </p>
    </div>
  );
}

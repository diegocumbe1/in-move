import type { Rom } from '@/lib/ficha';

type Move = { label: string; izq?: number | null; der?: number | null };

/** Gráfica de asimetría ROM: barras espejadas Izq/Der por movimiento bilateral. */
export function RomAsymmetry({ rom }: { rom?: Rom | null }) {
  const r = rom ?? {};
  const moves: Move[] = [
    { label: 'Hombro rot. interna', izq: r.hombroRotIntIzq, der: r.hombroRotIntDer },
    { label: 'Hombro rot. externa', izq: r.hombroRotExtIzq, der: r.hombroRotExtDer },
    { label: 'Hombro flexión', izq: r.hombroFlexionIzq, der: r.hombroFlexionDer },
    { label: 'Cadera flexión', izq: r.caderaFlexionIzq, der: r.caderaFlexionDer },
    { label: 'Rodilla flexión', izq: r.rodillaFlexionIzq, der: r.rodillaFlexionDer },
  ].filter((m) => m.izq != null || m.der != null);

  if (moves.length === 0) return null;

  const maxVal = Math.max(100, ...moves.flatMap((m) => [m.izq ?? 0, m.der ?? 0]));
  const pct = (v?: number | null) => (v == null ? 0 : (v / maxVal) * 100);

  return (
    <div className="mt-5 rounded-xl border border-[var(--fc-line-soft)] bg-[var(--fc-card)] p-4">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-[var(--fc-accent)]">Asimetría izquierda / derecha</p>
      <div className="mt-1 mb-4 flex items-center justify-center gap-4 text-xs text-[var(--fc-muted)]">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" /> Izquierda</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-600" /> Derecha</span>
      </div>

      <div className="space-y-3">
        {moves.map((m) => {
          const asym = m.izq != null && m.der != null && Math.abs(m.izq - m.der) >= 10;
          return (
            <div key={m.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="w-10 font-bold tabular-nums text-sky-600">{m.izq ?? '—'}</span>
                <span className="flex items-center gap-1.5 font-semibold text-[var(--fc-ink)]">
                  {m.label}
                  {asym ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Δ {Math.abs((m.izq ?? 0) - (m.der ?? 0))}°</span> : null}
                </span>
                <span className="w-10 text-right font-bold tabular-nums text-green-600">{m.der ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex flex-1 justify-end">
                  <div className="h-3 rounded-l-sm bg-sky-500" style={{ width: `${pct(m.izq)}%` }} />
                </div>
                <div className="h-4 w-px bg-[var(--fc-muted)]" />
                <div className="flex-1">
                  <div className="h-3 rounded-r-sm bg-green-600" style={{ width: `${pct(m.der)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-[var(--fc-muted)]">Diferencia ≥ 10° entre lados puede indicar asimetría a vigilar.</p>
    </div>
  );
}

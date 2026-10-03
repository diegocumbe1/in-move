import type { Level } from '@/styles/tokens';
import { formatDate } from '@/lib/date';
import { LEVEL_LABELS, LEVEL_ORDER, MIN_SAMPLE, type EvolutionSummary } from '@/lib/group-report';
import type { PublicGroupReport } from '@/lib/group-report-data';
import { GROUP_COLUMNS, MIN_PUBLIC_RANKING, type PublicRanking } from '@/lib/group-columns';
import { ScaleCellView } from '@/components/scale-cell';
import { AthletePhoto } from '@/components/admin-ui';

/**
 * Ficha grupal pública (enlace del responsable del grupo): composición, ranking,
 * promedios, semáforo grupal, evolución y conteo de alertas, con los indicadores
 * que el admin habilitó en Settings. Los nombres solo aparecen si Settings lo
 * permite; nunca hay enlaces a fichas individuales.
 */

const LEVEL_BG: Record<Level, string> = {
  danger: 'bg-level-danger',
  warning: 'bg-level-warning',
  good: 'bg-level-good',
  elite: 'bg-level-elite',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="rounded-md bg-[var(--fc-label-bg)] px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--fc-label-ink)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-[var(--fc-line-soft)] bg-[var(--fc-card-2)] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--fc-muted)]">{label}</p>
      <p className="tabular mt-1 text-2xl font-extrabold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--fc-muted)]">{hint}</p> : null}
    </div>
  );
}

function Bars({ rows, total }: { rows: Array<{ label: string; count: number }>; total: number }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-sm">
            <span>{row.label}</span>
            <span className="tabular font-semibold">{row.count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--fc-grid)]/40">
            <div className="h-full rounded-full bg-[var(--fc-accent)]" style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const insufficient = <span className="text-xs font-semibold text-[var(--fc-muted)]">Datos insuficientes</span>;

function RankingTable({ ranking }: { ranking: PublicRanking }) {
  if (ranking.columns.length === 0) {
    return <p className="text-sm text-[var(--fc-muted)]">No hay indicadores habilitados para este enlace.</p>;
  }
  if (ranking.rows.length === 0) {
    return (
      <p className="text-sm text-[var(--fc-muted)]">
        Se mostrará cuando al menos {MIN_PUBLIC_RANKING} deportistas del grupo tengan una valoración.
      </p>
    );
  }
  const columns = GROUP_COLUMNS.filter((column) => ranking.columns.includes(column.key));
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--fc-muted)]">
              <th className="sticky left-0 z-10 bg-[var(--fc-card)] py-2 pr-3">#</th>
              <th className="sticky left-8 z-10 bg-[var(--fc-card)] px-3 py-2">Deportista</th>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-2">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.rows.map((row, index) => (
              <tr key={index} className="border-t border-[var(--fc-line-soft)]">
                <td className="tabular sticky left-0 z-10 w-8 bg-[var(--fc-card)] py-2.5 pr-3 font-extrabold">{row.position}</td>
                <td className="sticky left-8 z-10 bg-[var(--fc-card)] px-3 py-2.5">
                  <div className="flex w-[170px] items-center gap-2">
                    {row.photoUrl ? (
                      <AthletePhoto src={row.photoUrl} alt={row.name ?? ''} width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
                    ) : null}
                    <span className="truncate font-semibold">{row.name ?? `Deportista ${index + 1}`}</span>
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2.5">
                    <ScaleCellView cell={row.cells[column.key] ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--fc-muted)]">
        Orden por score global de la última valoración. Cada barra muestra la escala del indicador (rojo bajo → azul excelente) y ▲ marca dónde cae el deportista.
        {ranking.withoutAssessment ? ` ${ranking.withoutAssessment} deportista(s) sin valoración no aparecen.` : ''}
      </p>
    </>
  );
}

function evolutionTone(item: EvolutionSummary): string {
  if (item.better === 'neutral' || item.deltaPct === 0) return 'text-[var(--fc-muted)]';
  const improved = item.better === 'higher' ? item.deltaPct > 0 : item.deltaPct < 0;
  return improved ? 'text-green-600' : 'text-red-600';
}

export function GroupReportView({ data }: { data: PublicGroupReport }) {
  const { group, report, ranking } = data;
  const accent = group.color ?? '#15803d';

  return (
    <div className="ficha-print mx-auto w-full max-w-[900px] overflow-hidden rounded-2xl border-2 border-green-600 bg-[var(--fc-card)] text-[var(--fc-ink)]">
      {/* Portada */}
      <div className="flex items-center gap-4 bg-green-700 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="In Move" className="size-14 shrink-0 rounded-full bg-[var(--fc-card)] object-cover ring-2 ring-white/40" />
        <h1 className="flex-1 text-center text-lg font-extrabold uppercase tracking-wide text-white md:text-xl">Ficha grupal In Move</h1>
        <span className="size-14 shrink-0" aria-hidden />
      </div>
      <div className="h-2" style={{ background: accent }} />

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-3xl font-extrabold" style={{ color: accent }}>{group.name}</p>
            {group.description ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{group.description}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {group.flags.map((flag) => (
                <span key={flag.label} className="rounded-full border border-[var(--fc-line)] px-3 py-1">
                  {flag.label}: <strong>{flag.value}</strong>
                </span>
              ))}
              {group.startsOn || group.endsOn ? (
                <span className="rounded-full border border-[var(--fc-line)] px-3 py-1">
                  Ciclo: {group.startsOn ? formatDate(group.startsOn) : '—'} → {group.endsOn ? formatDate(group.endsOn) : '—'}
                </span>
              ) : null}
            </div>
          </div>
          <div className="text-sm md:text-right">
            {group.responsible ? (
              <p>
                <span className="text-[var(--fc-muted)]">{group.responsible.role || 'Responsable'}: </span>
                <strong>{group.responsible.name}</strong>
              </p>
            ) : null}
            <p className="text-[var(--fc-muted)]">Generada el {formatDate(data.generatedOn)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Deportistas" value={report.members} />
          <Stat label="Con valoración" value={report.withAssessment} hint={report.members ? `${Math.round((report.withAssessment / report.members) * 100)}% del grupo` : undefined} />
          <Stat label="Última valoración" value={report.lastAssessedOn ? formatDate(report.lastAssessedOn) : '—'} />
        </div>

        {/* Ranking */}
        {ranking.enabled ? (
          <Section title="Ranking del grupo">
            <RankingTable ranking={ranking} />
          </Section>
        ) : null}

        {/* Composición */}
        <Section title="Composición del grupo">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-bold">Sexo</p>
              <Bars rows={[{ label: 'Masculino', count: report.composition.sex.M }, { label: 'Femenino', count: report.composition.sex.F }]} total={report.members} />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Edad</p>
              <Bars rows={report.composition.ages} total={report.members} />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Tipo de servicio</p>
              <Bars rows={report.composition.categories} total={report.members} />
            </div>
          </div>
        </Section>

        {/* Promedios */}
        {report.indicators.length || report.axes.length ? (
        <Section title="Promedios del grupo">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {report.indicators.map((indicator) => (
              <div key={indicator.key} className="rounded-lg border border-[var(--fc-line-soft)] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--fc-muted)]">{indicator.label}</p>
                <p className="tabular mt-1 text-xl font-extrabold">
                  {indicator.average == null ? insufficient : (
                    <>
                      {indicator.average}
                      <span className="ml-1 text-xs font-semibold text-[var(--fc-muted)]">{indicator.unit}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--fc-muted)]">{indicator.n} con dato</p>
              </div>
            ))}
          </div>
          {report.axes.length ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-bold">Perfil de rendimiento (0–100) frente a la referencia</p>
              {report.axes.map((axis) => (
                <div key={axis.label}>
                  <div className="flex justify-between text-sm">
                    <span>{axis.label}</span>
                    <span className="tabular">
                      {axis.average == null ? insufficient : <strong>{axis.average}</strong>}
                      <span className="text-[var(--fc-muted)]"> · referencia {axis.reference}</span>
                    </span>
                  </div>
                  <div className="relative mt-1 h-2.5 rounded-full bg-[var(--fc-grid)]/40">
                    {axis.average != null ? (
                      <div className="h-full rounded-full bg-[var(--fc-accent)]" style={{ width: `${axis.average}%` }} />
                    ) : null}
                    <div className="absolute -top-1 w-0.5 bg-[var(--fc-ink)]" style={{ left: `${axis.reference}%`, height: '18px' }} title="Referencia" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
        ) : null}

        {/* Semáforo grupal */}
        {report.trafficLights.length ? (
        <Section title="Semáforo grupal">
          <div className="space-y-3">
            {report.trafficLights.map((light) => {
              const empty = Object.keys(light.pct).length === 0;
              return (
                <div key={light.label}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{light.label}</span>
                    <span className="text-xs text-[var(--fc-muted)]">{light.n} con dato</span>
                  </div>
                  {empty ? (
                    <p className="mt-1">{insufficient}</p>
                  ) : (
                    <>
                      <div className="mt-1 flex h-3 overflow-hidden rounded-full">
                        {LEVEL_ORDER.filter((level) => light.pct[level]).map((level) => (
                          <div key={level} className={LEVEL_BG[level]} style={{ width: `${light.pct[level]}%` }} title={`${LEVEL_LABELS[level]} ${light.pct[level]}%`} />
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs">
                        {LEVEL_ORDER.filter((level) => light.pct[level]).map((level) => (
                          <span key={level} className="inline-flex items-center gap-1">
                            <span className={`size-2 rounded-full ${LEVEL_BG[level]}`} />
                            {LEVEL_LABELS[level]} {light.pct[level]}%
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
        ) : null}

        {/* Evolución */}
        <Section title="Evolución">
          {report.evolution.length === 0 ? (
            <p className="text-sm text-[var(--fc-muted)]">
              Se mostrará cuando al menos {MIN_SAMPLE} deportistas del grupo tengan dos valoraciones.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--fc-muted)]">
                    <th className="py-2">Indicador</th>
                    <th className="py-2">Anterior</th>
                    <th className="py-2">Última</th>
                    <th className="py-2">Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {report.evolution.map((item) => (
                    <tr key={item.key} className="border-t border-[var(--fc-line-soft)]">
                      <td className="py-2 font-semibold">{item.label}</td>
                      <td className="tabular py-2">{item.previous} {item.unit}</td>
                      <td className="tabular py-2">{item.latest} {item.unit}</td>
                      <td className={`tabular py-2 font-bold ${evolutionTone(item)}`}>
                        {item.deltaPct > 0 ? '▲' : item.deltaPct < 0 ? '▼' : '='} {Math.abs(item.deltaPct)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-[var(--fc-muted)]">Promedio de quienes tienen dos valoraciones: la anterior contra la última.</p>
            </div>
          )}
        </Section>

        {/* Alertas */}
        <Section title="Alertas">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="En alerta" value={report.alerts.alert} hint="Deportistas con algún indicador en zona baja" />
            <Stat label="En seguimiento" value={report.alerts.followUp} hint="Deportistas con indicadores a vigilar" />
          </div>
        </Section>

        <p className="mt-6 border-t border-[var(--fc-line-soft)] pt-3 text-[11px] text-[var(--fc-muted)]">
          {ranking.enabled && ranking.identity !== 'none'
            ? 'Ficha grupal con el ranking por deportista. '
            : 'Ficha grupal con datos generales: el ranking no identifica a los deportistas. '}
          Cada ficha individual completa la entrega el centro directamente a su deportista o acudiente. Los promedios con
          menos de {MIN_SAMPLE} datos no se muestran.
        </p>
      </div>
    </div>
  );
}

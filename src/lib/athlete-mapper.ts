import type { athletes, assessments } from '@/db/schema';
import { buildAssessment, deriveStatus } from '@/lib/scales';
import { emptyAssessment, type Athlete } from '@/lib/mock-product';
import { publicPhotoUrl } from '@/lib/photo';

/** Convierte una fila de deportista (+ TODAS sus valoraciones, más recientes primero) al shape de la UI. */
export async function toAthlete(
  row: typeof athletes.$inferSelect,
  rows: (typeof assessments.$inferSelect)[],
): Promise<Athlete> {
  const built = rows.map((r) =>
    buildAssessment(
      row.sex as 'M' | 'F',
      row.birthDate,
      r.assessedOn,
      {
        anthropometry: r.anthropometry,
        cardio: r.cardio,
        rom: r.rom,
        flexibility: r.flexibility,
        performance: r.performance,
        observations: r.observations,
        plan: r.plan,
      },
      r.id,
    ),
  );
  const assessments = built.length ? built : [emptyAssessment()];
  const latest = built[0];
  const state = latest ? deriveStatus(latest) : { status: 'warning' as const, statusLabel: 'Nuevo' };

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    document: row.document,
    birthDate: row.birthDate,
    sex: row.sex as 'M' | 'F',
    category: row.category ?? '',
    group: row.group ?? '',
    sport: row.sport ?? '',
    position: row.position ?? '',
    photoUrl: publicPhotoUrl(row.photoPath),
    disabled: Boolean(row.disabledAt),
    status: state.status,
    statusLabel: state.statusLabel,
    assessments,
  };
}

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { athletes, assessments } from '@/db/schema';
import { publicPhotoUrl } from '@/lib/photo';
import { chronologicalAge } from '@/lib/scales';
import type { FichaData } from '@/components/ficha-document';

/** Carga los datos de una ficha por id de valoración (uso público, sin sesión). */
export async function getFichaData(assessmentId: string): Promise<FichaData | null> {
  const [row] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  // Las fichas eliminadas (borrado lógico) dejan de ser públicas.
  if (!row || row.deletedAt) return null;
  const [ath] = await db.select().from(athletes).where(eq(athletes.id, row.athleteId)).limit(1);
  if (!ath) return null;

  return {
    name: ath.name,
    document: ath.document,
    birthDate: ath.birthDate,
    sex: ath.sex as 'M' | 'F',
    code: ath.code,
    category: ath.category,
    group: ath.group,
    sport: ath.sport,
    photoUrl: publicPhotoUrl(ath.photoPath),
    assessedOn: row.assessedOn,
    updatedAt: row.updatedAt?.toISOString(),
    age: chronologicalAge(ath.birthDate, row.assessedOn),
    anthropometry: row.anthropometry,
    cardio: row.cardio,
    rom: row.rom,
    flexibility: row.flexibility,
    performance: row.performance,
    observations: row.observations,
    plan: row.plan,
  };
}

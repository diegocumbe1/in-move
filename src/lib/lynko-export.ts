/**
 * Lo que In Move le entrega a Lynko: los deportistas (como clientes) y sus
 * grupos. Una sola consulta para dos usos:
 *   - `GET /api/integrations/athletes` (el botón "Sincronizar con In Move" de Lynko).
 *   - `scripts/export-for-lynko.ts` (carga a mano desde un archivo).
 *
 * SOLO LEE. Los borrados (`deleted_at`) no salen; los inhabilitados salen
 * marcados para que Lynko los deje inactivos sin perder su histórico.
 *
 * Sin imports `@/`: el script la corre con Node directo, que no resuelve alias.
 */
import type postgres from 'postgres';

export type LynkoExportAthlete = {
  id: string;
  code: string;
  name: string;
  document: string | null;
  birthDate: string;
  sex: string;
  category: string | null;
  /** Grupo-texto viejo (antes de la Fase 2 · C1). Si hay grupos reales, mandan ellos. */
  legacyGroup: string | null;
  sport: string | null;
  position: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** La ficha pública va por id de valoración, no por código de deportista. */
  latestAssessmentId: string | null;
  latestAssessedOn: string | null;
  assessmentsCount: number;
  groups: { id: string; name: string; joinedAt: string }[];
};

export type LynkoExportGroup = {
  id: string;
  name: string;
  status: string;
  capacity: number | null;
  startsOn: string | null;
  endsOn: string | null;
};

export type LynkoExport = {
  source: 'in-move';
  exportedAt: string;
  athletes: LynkoExportAthlete[];
  groups: LynkoExportGroup[];
};

type AthleteRow = {
  id: string;
  code: string;
  name: string;
  document: string | null;
  birth_date: string;
  sex: string;
  category: string | null;
  group: string | null;
  sport: string | null;
  position: string | null;
  disabled: boolean;
  created_at: string;
  updated_at: string;
  latest_assessment_id: string | null;
  latest_assessed_on: string | null;
  assessments_count: number;
};

export async function buildLynkoExport(sql: postgres.Sql): Promise<LynkoExport> {
  const athletes = await sql<AthleteRow[]>`
    SELECT
      a.id, a.code, a.name, a.document,
      to_char(a.birth_date, 'YYYY-MM-DD') AS birth_date,
      a.sex, a.category, a."group", a.sport, a.position,
      -- Fechas ya formateadas en SQL: el cliente de la app pasa por Drizzle, que
      -- devuelve los timestamps como texto, y el del script como Date. Así los
      -- dos caminos entregan exactamente lo mismo.
      a.disabled_at IS NOT NULL AS disabled,
      to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
      to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at,
      last.id AS latest_assessment_id,
      to_char(last.assessed_on, 'YYYY-MM-DD') AS latest_assessed_on,
      (SELECT count(*)::int FROM assessments x
        WHERE x.athlete_id = a.id AND x.deleted_at IS NULL) AS assessments_count
    FROM athletes a
    LEFT JOIN LATERAL (
      SELECT s.id, s.assessed_on FROM assessments s
      WHERE s.athlete_id = a.id AND s.deleted_at IS NULL
      ORDER BY s.assessed_on DESC, s.created_at DESC
      LIMIT 1
    ) last ON true
    WHERE a.deleted_at IS NULL
    ORDER BY a.name
  `;

  // La tabla de grupos puede no existir si no se corrió la Fase 2 · C1.
  const [{ has_groups }] = await sql<{ has_groups: boolean }[]>`
    SELECT to_regclass('public.group_members') IS NOT NULL AS has_groups
  `;
  const memberships = has_groups
    ? await sql<{ athlete_id: string; group_id: string; group_name: string; joined_at: string }[]>`
        SELECT m.athlete_id, g.id AS group_id, g.name AS group_name,
               to_char(m.joined_at, 'YYYY-MM-DD') AS joined_at
        FROM group_members m JOIN groups g ON g.id = m.group_id
        WHERE m.left_at IS NULL
      `
    : [];
  const groups = has_groups
    ? await sql<{ id: string; name: string; status: string; capacity: number | null; starts_on: string | null; ends_on: string | null }[]>`
        SELECT id, name, status, capacity,
               to_char(starts_on, 'YYYY-MM-DD') AS starts_on,
               to_char(ends_on, 'YYYY-MM-DD') AS ends_on
        FROM groups ORDER BY name
      `
    : [];

  const groupsByAthlete = new Map<string, LynkoExportAthlete['groups']>();
  for (const m of memberships) {
    const list = groupsByAthlete.get(m.athlete_id) ?? [];
    list.push({ id: m.group_id, name: m.group_name, joinedAt: m.joined_at });
    groupsByAthlete.set(m.athlete_id, list);
  }

  return {
    source: 'in-move',
    exportedAt: new Date().toISOString(),
    athletes: athletes.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name.trim(),
      document: a.document?.trim() || null,
      birthDate: a.birth_date,
      sex: a.sex,
      category: a.category,
      legacyGroup: a.group,
      sport: a.sport,
      position: a.position,
      disabled: a.disabled,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      latestAssessmentId: a.latest_assessment_id,
      latestAssessedOn: a.latest_assessed_on,
      assessmentsCount: a.assessments_count,
      groups: groupsByAthlete.get(a.id) ?? [],
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      capacity: g.capacity,
      startsOn: g.starts_on,
      endsOn: g.ends_on,
    })),
  };
}

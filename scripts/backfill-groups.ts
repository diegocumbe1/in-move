/**
 * Backfill Fase 2 · C1: convierte los grupos-texto de `athletes.group` en grupos
 * reales (`groups`) y membresías (`group_members`). Ver PLAN_FASE2_C1.md §2.
 *
 *   node --experimental-strip-types scripts/backfill-groups.ts           # simulación (no escribe)
 *   node --experimental-strip-types scripts/backfill-groups.ts --apply   # aplica
 *
 * - Requiere que `npm run db:push` ya haya creado las tablas.
 * - Idempotente: correrlo dos veces no duplica grupos ni membresías.
 * - En simulación hace todo dentro de una transacción y la deshace al final.
 * - No borra nada. Los deportistas sin grupo real (Libre, Juvenil) conservan su texto.
 */
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

/** Texto actual en athletes.group → nombre del grupo real. Lo que no esté aquí no se migra. */
const MAPPING: Record<string, string> = {
  Coofisam: 'Coofisam',
  // Mismo equipo: la semilla decía "Cofisam" y se corrigió en el catálogo sin propagar (2026-07).
  Cofisam: 'Coofisam',
  Running: 'Running',
};

/** Valores que NO son grupos reales: equivalen a "sin grupo" y conservan su texto. */
const NOT_GROUPS = ['Libre', 'Juvenil'];

/** Opciones iniciales de los flags del grupo (se agregan solo si no existen). */
const SEED_CATALOG: Record<string, string[]> = {
  sede: ['Garzón'],
  modalidad: ['Presencial', 'Remoto', 'Mixto'],
};

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const apply = process.argv.includes('--apply');
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DIRECT_URL / DATABASE_URL no están definidas en .env.local');

const sql = postgres(url, { prepare: false, max: 1 });
class Rollback extends Error {}

async function main() {
  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('groups', 'group_members')`;
  if (tables.length < 2) {
    throw new Error('Faltan las tablas groups / group_members. Corre primero `npm run db:push`.');
  }

  console.log(apply ? '▶ APLICANDO backfill\n' : '▶ SIMULACIÓN (no se escribe nada; usa --apply para aplicar)\n');

  const before = await sql<{ grupo: string; atletas: number }[]>`
    select coalesce("group", '(vacío)') as grupo, count(*)::int as atletas from athletes group by 1 order by 2 desc`;
  console.log('Distribución actual de athletes.group:');
  console.table(before);

  const unknown = before.filter((row) => !(row.grupo in MAPPING) && !NOT_GROUPS.includes(row.grupo) && row.grupo !== '(vacío)');
  if (unknown.length > 0) {
    console.warn('⚠ Valores sin regla (no se migran, quedan como están):', unknown.map((row) => row.grupo).join(', '));
  }

  try {
    await sql.begin(async (tx) => {
      // 1. Opciones iniciales de flags.
      for (const [kind, labels] of Object.entries(SEED_CATALOG)) {
        for (const label of labels) {
          const [exists] = await tx`select 1 from catalog_items where kind = ${kind} and lower(label) = lower(${label})`;
          if (!exists) {
            const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from catalog_items where kind = ${kind}`;
            await tx`insert into catalog_items (kind, label, sort) values (${kind}, ${label}, ${n})`;
            console.log(`+ catálogo ${kind}: ${label}`);
          }
        }
      }

      // 2. Grupos reales (por slug: no duplica).
      const groupIds = new Map<string, string>();
      for (const name of new Set(Object.values(MAPPING))) {
        const slug = slugify(name);
        const inserted = await tx<{ id: string }[]>`
          insert into groups (name, slug) values (${name}, ${slug})
          on conflict (slug) do nothing returning id`;
        const [row] = inserted.length ? inserted : await tx<{ id: string }[]>`select id from groups where slug = ${slug}`;
        groupIds.set(name, row.id);
        console.log(`${inserted.length ? '+' : '='} grupo ${name}`);
      }

      // 3. Membresías (solo si no hay una activa) y normalización del espejo de texto.
      for (const [text, groupName] of Object.entries(MAPPING)) {
        const groupId = groupIds.get(groupName)!;
        const athletes = await tx<{ id: string; name: string; created_at: Date }[]>`
          select id, name, created_at from athletes where "group" = ${text}`;
        for (const athlete of athletes) {
          const added = await tx`
            insert into group_members (group_id, athlete_id, joined_at)
            select ${groupId}, ${athlete.id}, ${athlete.created_at}::date
            where not exists (
              select 1 from group_members
              where group_id = ${groupId} and athlete_id = ${athlete.id} and left_at is null)`;
          if (added.count > 0) console.log(`  + ${athlete.name} → ${groupName}`);
          if (text !== groupName) {
            await tx`update athletes set "group" = ${groupName}, updated_at = now() where id = ${athlete.id}`;
            console.log(`  ~ ${athlete.name}: texto "${text}" → "${groupName}"`);
          }
        }
      }

      const [result] = await tx<{ grupos: number; membresias: number; sin_grupo: number }[]>`
        select (select count(*) from groups)::int as grupos,
               (select count(*) from group_members where left_at is null)::int as membresias,
               (select count(*) from athletes a where not exists (
                  select 1 from group_members m where m.athlete_id = a.id and m.left_at is null))::int as sin_grupo`;
      console.log('\nResultado:');
      console.table([result]);

      if (!apply) throw new Rollback();
    });
    console.log('✔ Aplicado.');
  } catch (error) {
    if (error instanceof Rollback) console.log('↺ Simulación terminada: se deshizo todo. Nada cambió en la base.');
    else throw error;
  }
}

main()
  .catch((error) => {
    console.error('✖', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

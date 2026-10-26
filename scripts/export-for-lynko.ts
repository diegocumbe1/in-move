/**
 * Exporta los deportistas de In Move a un archivo, para cargarlos en Lynko a
 * mano (sin pasar por la API).
 *
 *   node --experimental-strip-types scripts/export-for-lynko.ts --out=./lynko-export.json
 *
 * Lo carga `pos-system-backend/scripts/import-inmove-customers.ts`. Es la misma
 * consulta que sirve `GET /api/integrations/athletes`: los dos caminos entregan
 * exactamente lo mismo. SOLO LEE.
 */
import { writeFileSync } from 'node:fs';
import { config } from 'dotenv';
import postgres from 'postgres';
import { buildLynkoExport } from '../src/lib/lynko-export.ts';

config({ path: '.env.local' });

const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? './lynko-export.json';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida. Revisa .env.local');
  process.exit(1);
}

// `prepare: false`: lo exige el Transaction pooler de Supabase.
const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const payload = await buildLynkoExport(sql);
  writeFileSync(out, JSON.stringify(payload, null, 2));

  const disabled = payload.athletes.filter((a) => a.disabled).length;
  const withoutDoc = payload.athletes.filter((a) => !a.document).length;
  console.log(`Exportado a ${out}`);
  console.log(`  Deportistas: ${payload.athletes.length} (${disabled} inhabilitados, ${withoutDoc} sin documento)`);
  console.log(`  Grupos: ${payload.groups.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

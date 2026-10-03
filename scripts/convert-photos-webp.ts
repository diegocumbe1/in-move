/**
 * Convierte a WebP las fotos de deportistas que ya están en el bucket
 * `athlete-photos` (JPEG/PNG originales de hasta ~2 MB) y apunta
 * `athletes.photo_path` al archivo nuevo.
 *
 *   npm run photos:webp                 # simulación: descarga, convierte en memoria y reporta el ahorro
 *   npm run photos:webp -- --apply      # sube los .webp y actualiza la base
 *
 * Subir al bucket requiere permisos de escritura. Uno de los dos:
 *   SUPABASE_SERVICE_ROLE_KEY=…                          (en .env.local o en la línea de comandos)
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run photos:webp -- --apply
 *
 * - Idempotente: las fotos que ya son .webp se saltan.
 * - No borra los originales del bucket: si algo sale mal, basta con volver a
 *   poner la ruta vieja en `photo_path`. Se pueden limpiar a mano después.
 * - Mismo tratamiento que la subida desde la app (`src/lib/upload.ts`): lado
 *   mayor 800 px, WebP calidad 80, respetando la orientación EXIF.
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import postgres from 'postgres';
import sharp from 'sharp';

config({ path: '.env.local' });

const BUCKET = 'athlete-photos';
const MAX_EDGE = 800;
const QUALITY = 80;
const CACHE_CONTROL = '31536000';

const apply = process.argv.includes('--apply');
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!dbUrl || !supabaseUrl) throw new Error('Faltan DIRECT_URL/DATABASE_URL o NEXT_PUBLIC_SUPABASE_URL en .env.local');

const sql = postgres(dbUrl, { prepare: false, max: 1 });
const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

async function storageClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) return createClient(supabaseUrl!, serviceKey, { auth: { persistSession: false } });
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!anonKey || !email || !password) {
    throw new Error('Para --apply define SUPABASE_SERVICE_ROLE_KEY, o ADMIN_EMAIL y ADMIN_PASSWORD.');
  }
  const client = createClient(supabaseUrl!, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión como admin: ${error.message}`);
  return client;
}

async function main() {
  const rows = await sql<{ id: string; name: string; photo_path: string }[]>`
    select id, name, photo_path from athletes
    where photo_path is not null and photo_path <> '' and lower(photo_path) not like '%.webp'
    order by name`;
  console.log(`${rows.length} foto(s) por convertir${apply ? '' : ' (simulación, no escribe nada)'}.\n`);
  if (rows.length === 0) return;

  const storage = apply ? (await storageClient()).storage.from(BUCKET) : null;
  let before = 0;
  let after = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${row.photo_path}`);
      if (!response.ok) throw new Error(`descarga HTTP ${response.status}`);
      const original = Buffer.from(await response.arrayBuffer());
      const webp = await sharp(original)
        .rotate() // aplica la orientación EXIF antes de descartar los metadatos
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      before += original.length;
      after += webp.length;

      const path = `${randomUUID()}.webp`;
      if (storage) {
        const { error } = await storage.upload(path, webp, { contentType: 'image/webp', cacheControl: CACHE_CONTROL, upsert: false });
        if (error) throw new Error(`subida: ${error.message}`);
        await sql`update athletes set photo_path = ${path} where id = ${row.id} and photo_path = ${row.photo_path}`;
      }
      console.log(`✓ ${row.name}: ${kb(original.length)} → ${kb(webp.length)}${storage ? `  (${path})` : ''}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${row.name} (${row.photo_path}): ${(error as Error).message}`);
    }
  }

  console.log(`\nTotal: ${kb(before)} → ${kb(after)}${before ? ` (−${Math.round((1 - after / before) * 100)}%)` : ''}. Fallidas: ${failed}.`);
  if (!apply) console.log('Simulación. Para aplicar: npm run photos:webp -- --apply');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

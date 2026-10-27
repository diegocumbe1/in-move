/**
 * `POST /api/photos` — convierte a WebP la foto del deportista y la sube al
 * bucket. Solo la usa `src/lib/upload.ts` cuando el navegador no supo
 * codificar WebP (Safari en iPhone/iPad entrega JPEG desde el canvas).
 *
 * Mismo tratamiento que la subida desde la app y que scripts/convert-photos-webp.ts:
 * lado mayor 800 px, WebP calidad 80, respetando la orientación EXIF.
 * Sube con la sesión del usuario (RLS `authenticated`), no con service role.
 */
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { PHOTO_BUCKET } from '@/lib/photo';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EDGE = 800;
const QUALITY = 80;
const CACHE_CONTROL = '31536000';
/** Por debajo del límite de cuerpo de Vercel (4.5 MB); el cliente ya la reduce antes. */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La foto es demasiado grande' }, { status: 413 });
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Formato de imagen no soportado' }, { status: 415 });
  }

  const path = `${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, webp, {
    upsert: false,
    contentType: 'image/webp',
    cacheControl: CACHE_CONTROL,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}

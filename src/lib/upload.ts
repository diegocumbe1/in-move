'use client';

import { createClient } from '@/lib/supabase/client';

const PHOTO_BUCKET = 'athlete-photos';

/**
 * Lado mayor máximo al que se reduce la foto antes de subirla. La foto más
 * grande en pantalla es la de la ficha (240 px de ancho, 480 px en retina).
 */
const MAX_EDGE = 800;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;
/** Las rutas son UUID irrepetibles: el objeto nunca cambia, así que cachea un año. */
const CACHE_CONTROL = '31536000';

/** Carga el archivo en un bitmap, con fallback a <img> si el navegador no trae createImageBitmap. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // `imageOrientation` respeta el EXIF de las fotos tomadas con el móvil.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Safari antiguo rechaza las opciones o no decodifica la foto de 24/48 MP
      // del iPhone por memoria: se reintenta con <img>, que sí la reduce.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Reduce la foto a {@link MAX_EDGE} px de lado mayor y la reencoda como WebP.
 * Una foto de móvil pasa de ~2-3 MB a ~40-80 KB. Si el navegador no sabe
 * codificar WebP (devuelve PNG), cae a JPEG. Si algo falla devolvemos el
 * original: subir pesado es mejor que no poder crear el deportista.
 */
async function compress(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const original = { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), type: file.type || 'image/jpeg' };
  if (!file.type.startsWith('image/')) return original;

  try {
    const bitmap = await decode(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ('close' in bitmap) bitmap.close();

    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    const webp = await encode('image/webp', WEBP_QUALITY);
    if (webp?.type === 'image/webp' && webp.size < file.size) return { blob: webp, ext: 'webp', type: 'image/webp' };
    const jpeg = await encode('image/jpeg', JPEG_QUALITY);
    if (!jpeg || jpeg.size >= file.size) return original;
    return { blob: jpeg, ext: 'jpg', type: 'image/jpeg' };
  } catch {
    return original;
  }
}

/**
 * UUID v4. `crypto.randomUUID` solo existe en contexto seguro (HTTPS/localhost)
 * y desde iOS 15.4: al abrir la app por la IP de la red local o en un iPad
 * antiguo no está, así que se arma con `getRandomValues`, que sí existe siempre.
 */
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Límite de /api/photos (el de Vercel es 4.5 MB). */
const SERVER_WEBP_MAX_BYTES = 4 * 1024 * 1024;

/** Convierte a WebP en el servidor. Devuelve null si no se pudo, para subir tal cual. */
async function uploadViaServer(blob: Blob): Promise<string | null> {
  if (blob.size > SERVER_WEBP_MAX_BYTES) return null;
  try {
    const body = new FormData();
    body.append('file', blob);
    const response = await fetch('/api/photos', { method: 'POST', body });
    if (!response.ok) return null;
    const { path } = (await response.json()) as { path?: string };
    return path ?? null;
  } catch {
    return null;
  }
}

/**
 * Sube la foto del deportista al bucket (comprimida) y devuelve su ruta (path).
 * Siempre intenta dejarla en WebP: si el navegador no sabe codificarlo
 * (Safari en iPhone/iPad), la convierte el servidor.
 */
export async function uploadAthletePhoto(file: File): Promise<string> {
  const supabase = createClient();
  const { blob, ext, type } = await compress(file);
  if (type !== 'image/webp') {
    const serverPath = await uploadViaServer(blob);
    if (serverPath) return serverPath;
  }
  const path = `${uuid()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    upsert: false,
    contentType: type,
    cacheControl: CACHE_CONTROL,
  });
  if (error) throw error;
  return path;
}

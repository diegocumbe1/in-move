'use client';

import { createClient } from '@/lib/supabase/client';

const PHOTO_BUCKET = 'athlete-photos';

/** Lado mayor máximo al que se reduce la foto antes de subirla. */
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.82;
/** Las rutas son UUID irrepetibles: el objeto nunca cambia, así que cachea un año. */
const CACHE_CONTROL = '31536000';

/** Carga el archivo en un bitmap, con fallback a <img> si el navegador no trae createImageBitmap. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    // `imageOrientation` respeta el EXIF de las fotos tomadas con el móvil.
    return createImageBitmap(file, { imageOrientation: 'from-image' });
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
 * Reduce la foto a {@link MAX_EDGE} px de lado mayor y la reencoda como JPEG.
 * Una foto de móvil pasa de ~2-3 MB a ~80-150 KB. Si algo falla devolvemos el
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return original;
    return { blob, ext: 'jpg', type: 'image/jpeg' };
  } catch {
    return original;
  }
}

/** Sube la foto del deportista al bucket (comprimida) y devuelve su ruta (path). */
export async function uploadAthletePhoto(file: File): Promise<string> {
  const supabase = createClient();
  const { blob, ext, type } = await compress(file);
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    upsert: false,
    contentType: type,
    cacheControl: CACHE_CONTROL,
  });
  if (error) throw error;
  return path;
}

'use client';

import { createClient } from '@/lib/supabase/client';

const PHOTO_BUCKET = 'athlete-photos';

/** Sube la foto del deportista al bucket privado y devuelve su ruta (path). */
export async function uploadAthletePhoto(file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  return path;
}

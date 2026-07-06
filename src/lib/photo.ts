export const PHOTO_BUCKET = 'athlete-photos';

/** URL pública de una foto del bucket (bucket público; las rutas son UUID). */
export function publicPhotoUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

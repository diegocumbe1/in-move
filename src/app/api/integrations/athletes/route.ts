/**
 * `GET /api/integrations/athletes` — lo que consume el botón "Sincronizar con
 * In Move" de Lynko: los deportistas y sus grupos (ver src/lib/lynko-export.ts).
 *
 * SE PROTEGE CON CLAVE, NO CON SESIÓN. Lynko manda `Authorization: Bearer
 * <LYNKO_SYNC_KEY>`. Sin la variable configurada la ruta está apagada (503):
 * nunca queda abierta por olvido. Solo lee.
 */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { sqlClient } from '@/db';
import { buildLynkoExport } from '@/lib/lynko-export';

export const dynamic = 'force-dynamic';

function sameKey(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const expected = process.env.LYNKO_SYNC_KEY;
  if (!expected) {
    return NextResponse.json({ error: 'Integración con Lynko no configurada' }, { status: 503 });
  }
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!sameKey(given, expected)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const payload = await buildLynkoExport(sqlClient);
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

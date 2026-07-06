// Capa de datos del preview. Hoy persiste en localStorage; mañana esta misma
// interfaz se implementa contra Supabase sin tocar los componentes.

import { Sexo, scoreFuerza, scoreVelocidad, scoreResistencia, scoreSalto } from "./escalas";
import type { Snapshot } from "./historial";

export interface ValoracionGuardada {
  id: string;
  documento: string;
  nombre: string;
  sexo: Sexo;
  fechaNac: string;
  fecha: string; // fecha de valoración (ISO)
  estatura: number | null;
  grasa: number | null;
  fcReposo: number | null;
  sitReach: number | null;
  cmj: number | null;
  vel10: number | null;
  sent1rm: number | null;
  vo2: number | null;
  observaciones: string;
}

const KEY = "inmove.valoraciones";

function readAll(): ValoracionGuardada[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(list: ValoracionGuardada[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveValoracion(v: ValoracionGuardada): void {
  writeAll([...readAll(), v]);
}

/** Valoraciones de un deportista, ordenadas por fecha ascendente */
export function getByDocumento(documento: string): ValoracionGuardada[] {
  if (!documento) return [];
  return readAll()
    .filter((v) => v.documento === documento)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function nuevoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now());
}

/** Convierte una valoración guardada en un punto del historial (puntajes 0–100) */
export function toSnapshot(v: ValoracionGuardada): Snapshot {
  return {
    fecha: v.fecha,
    fuerza: scoreFuerza(v.sent1rm) ?? 0,
    velocidad: scoreVelocidad(v.vel10) ?? 0,
    resistencia: scoreResistencia(v.vo2) ?? 0,
    salto: scoreSalto(v.cmj) ?? 0,
    grasa: v.grasa ?? 0,
    fcReposo: v.fcReposo ?? 0,
  };
}

// Snapshot de una valoración en el tiempo (puntajes 0–100 por capacidad).
// En producción esto vendrá de la base de datos (una fila por valoración).

export interface Snapshot {
  fecha: string; // ISO
  fuerza: number;
  velocidad: number;
  resistencia: number;
  salto: number;
  grasa: number; // % grasa (referencia)
  fcReposo: number; // ppm (referencia)
}

// Historial de ejemplo: 3 valoraciones separadas ~3 meses (progreso visible).
export const HISTORIAL_DEMO: Snapshot[] = [
  { fecha: "2026-01-15", fuerza: 64, velocidad: 66, resistencia: 58, salto: 60, grasa: 19, fcReposo: 72 },
  { fecha: "2026-04-15", fuerza: 73, velocidad: 70, resistencia: 60, salto: 70, grasa: 16, fcReposo: 64 },
  { fecha: "2026-07-15", fuerza: 82, velocidad: 74, resistencia: 63, salto: 78, grasa: 14, fcReposo: 58 },
];

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export const CAPS_HIST = [
  { key: "fuerza", label: "Fuerza máxima" },
  { key: "velocidad", label: "Velocidad punta" },
  { key: "resistencia", label: "Resistencia" },
  { key: "salto", label: "Altura de salto" },
] as const;

// Datos de ejemplo para el módulo de Histórico. En producción vienen de la BD.
import type { Snapshot } from "./historial";

export interface MockValoracion extends Snapshot {
  sitReach: number; // cm (para la pestaña Escalas)
}

export interface MockDeportista {
  id: string;
  documento: string;
  nombre: string;
  sexo: "M" | "F";
  grupo: string;
  codigo: string; // 8 dígitos
  fechaNac: string;
  valoraciones: MockValoracion[]; // orden ascendente por fecha
}

export const GRUPOS = ["Todos", "Running", "Cofisam"];

export const MOCK_DEPORTISTAS: MockDeportista[] = [
  {
    id: "1", documento: "1114572691", nombre: "Daniel Peña", sexo: "M", grupo: "Running",
    codigo: "48276105", fechaNac: "2011-04-29",
    valoraciones: [
      { fecha: "2026-01-15", fuerza: 64, velocidad: 66, resistencia: 58, salto: 60, grasa: 19, fcReposo: 72, sitReach: 26 },
      { fecha: "2026-04-15", fuerza: 73, velocidad: 70, resistencia: 60, salto: 70, grasa: 16, fcReposo: 64, sitReach: 28 },
      { fecha: "2026-07-15", fuerza: 82, velocidad: 74, resistencia: 63, salto: 78, grasa: 14, fcReposo: 58, sitReach: 30 },
    ],
  },
  {
    id: "2", documento: "1077867547", nombre: "Samuel Bustos", sexo: "M", grupo: "Running",
    codigo: "71903355", fechaNac: "2012-02-16",
    valoraciones: [
      { fecha: "2026-02-01", fuerza: 58, velocidad: 62, resistencia: 64, salto: 55, grasa: 18, fcReposo: 70, sitReach: 22 },
      { fecha: "2026-05-01", fuerza: 66, velocidad: 68, resistencia: 67, salto: 63, grasa: 16, fcReposo: 66, sitReach: 25 },
    ],
  },
  {
    id: "3", documento: "1099220145", nombre: "María José Ríos", sexo: "F", grupo: "Cofisam",
    codigo: "30514882", fechaNac: "2010-09-08",
    valoraciones: [
      { fecha: "2026-01-20", fuerza: 52, velocidad: 60, resistencia: 70, salto: 58, grasa: 24, fcReposo: 68, sitReach: 29 },
      { fecha: "2026-04-20", fuerza: 60, velocidad: 65, resistencia: 74, salto: 66, grasa: 22, fcReposo: 63, sitReach: 33 },
      { fecha: "2026-07-20", fuerza: 68, velocidad: 69, resistencia: 78, salto: 72, grasa: 21, fcReposo: 60, sitReach: 36 },
    ],
  },
  {
    id: "4", documento: "1085330912", nombre: "Juan Pablo Hamón", sexo: "M", grupo: "Cofisam",
    codigo: "66271408", fechaNac: "2009-03-08",
    valoraciones: [
      { fecha: "2026-03-05", fuerza: 78, velocidad: 80, resistencia: 62, salto: 74, grasa: 13, fcReposo: 56, sitReach: 24 },
      { fecha: "2026-06-05", fuerza: 84, velocidad: 83, resistencia: 64, salto: 79, grasa: 12, fcReposo: 54, sitReach: 27 },
    ],
  },
  {
    id: "5", documento: "1076918175", nombre: "Thiago Varón", sexo: "M", grupo: "Running",
    codigo: "19042377", fechaNac: "2013-11-26",
    valoraciones: [
      { fecha: "2026-02-10", fuerza: 46, velocidad: 58, resistencia: 55, salto: 50, grasa: 17, fcReposo: 74, sitReach: 21 },
      { fecha: "2026-05-10", fuerza: 55, velocidad: 63, resistencia: 59, salto: 60, grasa: 15, fcReposo: 69, sitReach: 24 },
      { fecha: "2026-08-10", fuerza: 63, velocidad: 67, resistencia: 62, salto: 68, grasa: 14, fcReposo: 65, sitReach: 27 },
    ],
  },
];

export function fmtCodigo(c: string): string {
  return c.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

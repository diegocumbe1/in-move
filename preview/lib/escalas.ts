// Escalas de clasificación por rangos/colores (estándar por defecto — editable desde settings).
// Basado en FICHA_CAMPOS.md.

export type Sexo = "M" | "F";
export type Nivel = "rojo" | "amarillo" | "verde" | "azul";
export interface Clasificacion {
  nivel: Nivel;
  etiqueta: string;
}

const nada: Clasificacion | null = null;

/** % Grasa corporal (por sexo) */
export function clasificarGrasa(sexo: Sexo, v: number | null): Clasificacion | null {
  if (v == null || isNaN(v)) return nada;
  if (sexo === "M") {
    if (v <= 5) return { nivel: "azul", etiqueta: "Esencial" };
    if (v <= 13) return { nivel: "verde", etiqueta: "Atleta" };
    if (v <= 17) return { nivel: "verde", etiqueta: "Saludable" };
    if (v <= 24) return { nivel: "amarillo", etiqueta: "Aceptable" };
    return { nivel: "rojo", etiqueta: "Exceso" };
  }
  if (v <= 13) return { nivel: "azul", etiqueta: "Esencial" };
  if (v <= 20) return { nivel: "verde", etiqueta: "Atleta" };
  if (v <= 24) return { nivel: "verde", etiqueta: "Saludable" };
  if (v <= 31) return { nivel: "amarillo", etiqueta: "Aceptable" };
  return { nivel: "rojo", etiqueta: "Exceso" };
}

/** FC en reposo (ppm) */
export function clasificarFcReposo(v: number | null): Clasificacion | null {
  if (v == null || isNaN(v)) return nada;
  if (v > 80) return { nivel: "rojo", etiqueta: "Baja condición" };
  if (v >= 60) return { nivel: "amarillo", etiqueta: "Normal" };
  if (v >= 50) return { nivel: "verde", etiqueta: "Buena" };
  return { nivel: "azul", etiqueta: "Atleta" };
}

/** Sit and Reach (cm, por sexo) */
export function clasificarSitAndReach(sexo: Sexo, v: number | null): Clasificacion | null {
  if (v == null || isNaN(v)) return nada;
  const t = sexo === "M" ? [20, 27, 35] : [23, 30, 38];
  if (v < t[0]) return { nivel: "rojo", etiqueta: "Bajo" };
  if (v <= t[1]) return { nivel: "amarillo", etiqueta: "Promedio" };
  if (v <= t[2]) return { nivel: "verde", etiqueta: "Bueno" };
  return { nivel: "azul", etiqueta: "Excelente" };
}

/** Asimetría izquierda-derecha (%) — alerta si supera el umbral */
export function asimetria(izq: number | null, der: number | null, umbral = 10): Clasificacion | null {
  if (izq == null || der == null || isNaN(izq) || isNaN(der)) return nada;
  const max = Math.max(izq, der);
  if (max === 0) return nada;
  const diff = (Math.abs(izq - der) / max) * 100;
  if (diff <= umbral) return { nivel: "verde", etiqueta: `Simétrico (${diff.toFixed(0)}%)` };
  return { nivel: "amarillo", etiqueta: `Asimetría ${diff.toFixed(0)}%` };
}

/* ---- Normalización a puntaje 0–100 para el radar de rendimiento ----
   Rangos de referencia (editables en el futuro desde settings). */

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

/** Escala lineal: min → 0, max → 100 */
function norm(v: number | null, min: number, max: number): number | null {
  if (v == null || isNaN(v)) return null;
  return clamp(((v - min) / (max - min)) * 100);
}

/** Fuerza máxima ← Sentadilla 1RM (kg) */
export const scoreFuerza = (kg: number | null) => norm(kg, 40, 140);

/** Altura de salto ← CMJ (cm) */
export const scoreSalto = (cm: number | null) => norm(cm, 15, 55);

/** Resistencia ← VO₂máx (ml/kg/min) */
export const scoreResistencia = (vo2: number | null) => norm(vo2, 30, 65);

/** Velocidad punta ← tiempo en 10 m (s): menos tiempo = más puntaje */
export function scoreVelocidad(t10: number | null): number | null {
  if (t10 == null || isNaN(t10) || t10 <= 0) return null;
  return clamp(((2.4 - t10) / (2.4 - 1.5)) * 100);
}

/** km/h a partir del tiempo en 10 m (para mostrar la medida real) */
export function kmhDesde10m(t10: number | null): number | null {
  if (t10 == null || isNaN(t10) || t10 <= 0) return null;
  return (10 / t10) * 3.6;
}

/* ---- Definición de escalas como bandas de color (para la vista comparativa) ---- */
export interface Banda { to: number; nivel: Nivel; label: string }
export interface EscalaDef { titulo: string; unidad: string; min: number; max: number; bandas: Banda[] }

export function escalaGrasa(sexo: Sexo): EscalaDef {
  return sexo === "M"
    ? { titulo: "% Grasa corporal", unidad: "%", min: 0, max: 40, bandas: [
        { to: 5, nivel: "azul", label: "Esencial" }, { to: 13, nivel: "verde", label: "Atleta" },
        { to: 17, nivel: "verde", label: "Saludable" }, { to: 24, nivel: "amarillo", label: "Aceptable" },
        { to: 40, nivel: "rojo", label: "Exceso" } ] }
    : { titulo: "% Grasa corporal", unidad: "%", min: 0, max: 45, bandas: [
        { to: 13, nivel: "azul", label: "Esencial" }, { to: 20, nivel: "verde", label: "Atleta" },
        { to: 24, nivel: "verde", label: "Saludable" }, { to: 31, nivel: "amarillo", label: "Aceptable" },
        { to: 45, nivel: "rojo", label: "Exceso" } ] };
}

export function escalaFcReposo(): EscalaDef {
  return { titulo: "FC en reposo", unidad: "ppm", min: 40, max: 100, bandas: [
    { to: 50, nivel: "azul", label: "Atleta" }, { to: 59, nivel: "verde", label: "Buena" },
    { to: 80, nivel: "amarillo", label: "Normal" }, { to: 100, nivel: "rojo", label: "Baja condición" } ] };
}

export function escalaSitReach(sexo: Sexo): EscalaDef {
  return sexo === "M"
    ? { titulo: "Sit and Reach", unidad: "cm", min: 0, max: 45, bandas: [
        { to: 20, nivel: "rojo", label: "Bajo" }, { to: 27, nivel: "amarillo", label: "Promedio" },
        { to: 35, nivel: "verde", label: "Bueno" }, { to: 45, nivel: "azul", label: "Excelente" } ] }
    : { titulo: "Sit and Reach", unidad: "cm", min: 0, max: 48, bandas: [
        { to: 23, nivel: "rojo", label: "Bajo" }, { to: 30, nivel: "amarillo", label: "Promedio" },
        { to: 38, nivel: "verde", label: "Bueno" }, { to: 48, nivel: "azul", label: "Excelente" } ] };
}

export function edadDesde(fechaNac: string): number | null {
  if (!fechaNac) return null;
  const d = new Date(fechaNac);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Edad cronológica en años decimales (para el cálculo de maduración) */
export function edadDecimal(fechaNac: string): number | null {
  if (!fechaNac) return null;
  const d = new Date(fechaNac);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Edad biológica estimada (años) por maduración — ecuación de Moore (2015),
 * "maturity offset" a partir de sexo, edad y estatura. Es una ESTIMACIÓN:
 * el método puede cambiarse (Mirwald con talla sentado, Khamis-Roche con
 * talla parental, o edad ósea). Requiere estatura en cm.
 */
export function edadBiologica(
  sexo: Sexo,
  edadDec: number | null,
  estaturaCm: number | null
): number | null {
  if (edadDec == null || estaturaCm == null || isNaN(edadDec) || isNaN(estaturaCm) || estaturaCm <= 0) return null;
  const AH = edadDec * estaturaCm; // edad × estatura
  const offset = sexo === "M"
    ? -7.999994 + 0.0036124 * AH
    : -7.709133 + 0.0042232 * AH;
  const refAPHV = sexo === "M" ? 13.8 : 12.0; // edad media de pico de velocidad de crecimiento
  return refAPHV + offset;
}

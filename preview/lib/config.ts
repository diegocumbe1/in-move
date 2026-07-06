// Fuente única de las "variables" del sistema, editables por el admin desde /ajustes.
// En producción esto se guarda por-centro en la base de datos y todos los cálculos
// (escalas, normalización, radar) lo leen desde aquí. Hoy sirve de referencia y demo.

export interface Config {
  normalizacion: {
    fuerza: { min: number; max: number };       // 1RM sentadilla (kg)
    velocidad: { lento: number; rapido: number }; // 10 m (s): lento→0, rápido→100
    resistencia: { min: number; max: number };   // VO₂máx (ml/kg)
    salto: { min: number; max: number };          // CMJ (cm)
  };
  equipo: { fuerza: number; velocidad: number; resistencia: number; salto: number };
  grasa: {
    hombres: { esencial: number; atleta: number; saludable: number; aceptable: number };
    mujeres: { esencial: number; atleta: number; saludable: number; aceptable: number };
  };
  fcReposo: { atleta: number; buena: number; normal: number };
  sitReach: {
    hombres: { bajo: number; promedio: number; bueno: number };
    mujeres: { bajo: number; promedio: number; bueno: number };
  };
  maduracion: { metodo: string; phvHombres: number; phvMujeres: number };
  rom: { umbralAsimetria: number };
  general: { longitudCodigo: number };
}

export const DEFAULT_CONFIG: Config = {
  normalizacion: {
    fuerza: { min: 40, max: 140 },
    velocidad: { lento: 2.4, rapido: 1.5 },
    resistencia: { min: 30, max: 65 },
    salto: { min: 15, max: 55 },
  },
  equipo: { fuerza: 70, velocidad: 68, resistencia: 66, salto: 61 },
  grasa: {
    hombres: { esencial: 5, atleta: 13, saludable: 17, aceptable: 24 },
    mujeres: { esencial: 13, atleta: 20, saludable: 24, aceptable: 31 },
  },
  fcReposo: { atleta: 50, buena: 59, normal: 80 },
  sitReach: {
    hombres: { bajo: 20, promedio: 27, bueno: 35 },
    mujeres: { bajo: 23, promedio: 30, bueno: 38 },
  },
  maduracion: { metodo: "Moore (estatura)", phvHombres: 13.8, phvMujeres: 12.0 },
  rom: { umbralAsimetria: 10 },
  general: { longitudCodigo: 8 },
};

export const METODOS_MADURACION = [
  "Moore (estatura)",
  "Mirwald (talla sentado)",
  "Khamis-Roche (talla parental)",
  "Manual (edad ósea / Tanner)",
];

const KEY = "inmove.config";

export function loadConfig(): Config {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: Config): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cfg));
}

import { z } from 'zod';

/**
 * Definicion de los campos de medida de la ficha (FICHA_CAMPOS.md).
 *
 * Fuente unica de verdad para las medidas guardadas en las columnas JSONB de
 * `assessments`. Todos los campos son OPCIONALES a proposito: en la rutina del
 * centro las medidas se llenan solo cuando se toman. Para agregar un campo nuevo
 * basta con anadirlo aqui y en el formulario -> NO requiere migracion de BD,
 * porque se almacena dentro del JSONB del dominio correspondiente.
 */

// § 2. Antropometria
export const anthropometrySchema = z.object({
  pesoKg: z.number().optional(),
  estaturaCm: z.number().optional(),
  pctGrasa: z.number().optional(),
  pctMasa: z.number().optional(),
});

// § 3. Cardiovascular (frecuencia cardiaca)
export const cardioSchema = z.object({
  fcReposo: z.number().optional(),
  fcInicial: z.number().optional(),
  fcFinal: z.number().optional(),
  fcMax: z.number().optional(),
});

// § 4. Movilidad y flexibilidad (ROM) en grados
export const romSchema = z.object({
  columnaFlexion: z.number().optional(),
  columnaExtension: z.number().optional(),
  caderaFlexionDer: z.number().optional(),
  caderaFlexionIzq: z.number().optional(),
  hombroRotIntDer: z.number().optional(),
  hombroRotIntIzq: z.number().optional(),
  hombroRotExtDer: z.number().optional(),
  hombroRotExtIzq: z.number().optional(),
  hombroFlexionDer: z.number().optional(),
  hombroFlexionIzq: z.number().optional(),
  rodillaFlexionDer: z.number().optional(),
  rodillaFlexionIzq: z.number().optional(),
  otraLabel: z.string().optional(),
  otraValor: z.number().optional(),
});

// § 5. Neuromuscular — flexibilidad (Sit and Reach)
export const flexibilitySchema = z.object({
  pruebaAplicada: z.string().optional(),
  resultadoCm: z.number().optional(),
  observacion: z.string().optional(),
});

// § 6. Rendimiento (saltos, fuerza, velocidad/agilidad)
export const performanceSchema = z.object({
  sjCm: z.number().optional(),
  cmjCm: z.number().optional(),
  abalakovCm: z.number().optional(),
  saltoUnilateralDerCm: z.number().optional(),
  saltoUnilateralIzqCm: z.number().optional(),
  fuerzaMaximaKg: z.number().optional(),
  sentadilla1rmKg: z.number().optional(),
  pressBanca1rmKg: z.number().optional(),
  pct1rmSentadilla: z.number().optional(),
  velocidad10mS: z.number().optional(),
  velocidad30mS: z.number().optional(),
  agilidad505S: z.number().optional(),
});

export type Anthropometry = z.infer<typeof anthropometrySchema>;
export type Cardio = z.infer<typeof cardioSchema>;
export type Rom = z.infer<typeof romSchema>;
export type Flexibility = z.infer<typeof flexibilitySchema>;
export type Performance = z.infer<typeof performanceSchema>;

export const SEXES = ['M', 'F'] as const;
export type Sex = (typeof SEXES)[number];

export const CATALOG_KINDS = ['category', 'group', 'sport', 'position'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

/**
 * Madurez biológica: estimación del PHV (Peak Height Velocity) y biobanding.
 *
 * Separado de `scales.ts` a propósito: aquí no se puntúa rendimiento, se estima
 * en qué punto del estirón puberal está el deportista. Dos chicos de la misma
 * edad cronológica pueden estar a dos años de distancia en madurez, y eso cambia
 * cómo se lee cualquier test físico.
 *
 * ECUACIONES VERIFICADAS (reproducen el caso de referencia del informe impreso):
 *   - Mirwald et al. (2002) — ambos sexos, requiere estatura sentado y peso.
 *   - Moore et al. (2015)   — ambos sexos, más parsimoniosa.
 *
 * NO IMPLEMENTADAS a propósito, ver `UNAVAILABLE`: Fransen (2018) y Khamis-Roche.
 * Los coeficientes publicados que pudimos localizar no reproducen valores
 * plausibles, y una calculadora de madurez que da un número creíble pero falso
 * sobre un menor es peor que una que dice "sin dato".
 */

import type { Anthropometry, Sex } from './ficha';

export type MethodKey = 'moore' | 'mirwald' | 'fransen' | 'khamisRoche';

export type MaturityPhase = 'pre' | 'circum' | 'post';

export type MaturityMethod = {
  key: MethodKey;
  label: string;
  reference: string;
  /** Años transcurridos desde el PHV (+) o que faltan para él (−). */
  offsetYears: number | null;
  /** Edad cronológica a la que se estima que ocurre/ocurrió el PHV. */
  ageAtPhv: number | null;
  /** Error estándar de estimación del modelo, en años. */
  standardError: number | null;
  /** Medidas que faltan para poder calcularlo. Vacío si se pudo calcular. */
  missing: string[];
  /** Si está presente, el método no se ofrece y este es el motivo. */
  unavailable?: string;
};

export type MaturityReport = {
  /** Edad cronológica decimal en la fecha de la valoración. */
  age: number | null;
  /**
   * Si es false, el PHV no tiene sentido para este deportista (adulto, o sin
   * fecha de nacimiento) y la ficha omite el bloque entero en vez de llenarlo
   * de "no disponible".
   */
  applicable: boolean;
  methods: MaturityMethod[];
  /** Fase derivada del método de referencia (Mirwald, con Moore como respaldo). */
  phase: MaturityPhase | null;
  /** Offset del método de referencia, el que alimenta la barra de biobanding. */
  referenceOffset: number | null;
  referenceLabel: string | null;
};

/** Umbral en años a cada lado del PHV que delimita la franja CIRCUM. */
const CIRCUM_BAND_YEARS = 1;

/**
 * Rango de edad en el que las ecuaciones fueron validadas. Fuera de él no se
 * estima nada: son regresiones ajustadas sobre cohortes de niños y adolescentes,
 * y extrapolarlas a un adulto devuelve un número con apariencia de dato ("pasaron
 * 7.4 años del PHV") que ningún estudio respalda. El centro también valora
 * adultos, así que el caso es real, no teórico.
 */
export const VALID_AGE_MIN = 8;
export const VALID_AGE_MAX = 18;

/**
 * Si el PHV tiene sentido para esta edad. Úsala en cualquier sitio que muestre
 * un dato de madurez suelto: sin ella, la ficha de un adulto oculta el bloque
 * de madurez pero deja a la vista una "edad estimada al PHV" extrapolada.
 */
export const isMaturityApplicable = (age: number | null | undefined): boolean =>
  age != null && age >= VALID_AGE_MIN && age <= VALID_AGE_MAX;

const UNAVAILABLE: Partial<Record<MethodKey, string>> = {
  fransen:
    'Pendiente de verificar los coeficientes con el artículo original (Pediatric Exercise Science, 2018).',
  khamisRoche:
    'Pendiente la tabla de coeficientes por edad y sexo (Khamis-Roche, 1994) y la talla de ambos padres.',
};

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Normaliza una longitud a centímetros.
 *
 * En los datos capturados hasta ahora `estaturaCm` viene mezclada: la mitad de
 * las valoraciones guardan metros (1.58) y la otra mitad centímetros (146).
 * Sin esto, un 1.58 con talla sentado de 75 hace que Mirwald devuelva null y el
 * bloque desaparezca sin explicación. Ninguna medida humana cae por debajo de
 * 3 cm, así que el umbral no puede confundir un valor legítimo.
 *
 * Es una red de seguridad de lectura, no un arreglo: el dato de origen sigue mal
 * y conviene normalizarlo en la base.
 */
const toCm = (value: number | null): number | null =>
  value == null ? null : value < 3 ? value * 100 : value;

/**
 * Mirwald et al. (2002). Devuelve el maturity offset en años.
 * `weightHeightRatio` va expresado como porcentaje, tal como en el artículo.
 */
export function mirwaldOffset(
  sex: Sex,
  age: number,
  heightCm: number,
  sittingHeightCm: number,
  weightKg: number,
): number | null {
  // La talla sentado no puede superar a la estatura: si ocurre, hay un error de captura.
  if (sittingHeightCm >= heightCm) return null;

  const legLengthCm = heightCm - sittingHeightCm;
  const weightHeightRatio = (weightKg / heightCm) * 100;

  return sex === 'M'
    ? -9.236 +
        0.0002708 * (legLengthCm * sittingHeightCm) -
        0.001663 * (age * legLengthCm) +
        0.007216 * (age * sittingHeightCm) +
        0.02292 * weightHeightRatio
    : -9.376 +
        0.0001882 * (legLengthCm * sittingHeightCm) +
        0.0022 * (age * legLengthCm) +
        0.005841 * (age * sittingHeightCm) -
        0.002658 * (age * weightKg) +
        0.07693 * weightHeightRatio;
}

/**
 * Moore et al. (2015). En varones el artículo publica dos variantes: la de talla
 * sentado es la preferente y la de estatura sirve de respaldo cuando no se midió
 * la talla sentado. En mujeres solo existe la de estatura.
 */
export function mooreOffset(
  sex: Sex,
  age: number,
  heightCm: number | null,
  sittingHeightCm: number | null,
): number | null {
  if (sex === 'F') {
    return heightCm == null ? null : -7.709133 + 0.0042232 * (age * heightCm);
  }
  if (sittingHeightCm != null) return -8.128741 + 0.0070346 * (age * sittingHeightCm);
  if (heightCm != null) return -7.999994 + 0.0036124 * (age * heightCm);
  return null;
}

/** Fase de biobanding a partir del maturity offset. */
export function phaseFromOffset(offsetYears: number | null): MaturityPhase | null {
  if (offsetYears == null) return null;
  if (offsetYears < -CIRCUM_BAND_YEARS) return 'pre';
  if (offsetYears > CIRCUM_BAND_YEARS) return 'post';
  return 'circum';
}

export const PHASE_LABEL: Record<MaturityPhase, string> = {
  pre: 'PRE-PHV',
  circum: 'CIRCUM-PHV',
  post: 'POST-PHV',
};

/** Lectura en lenguaje de entrenador del offset. */
export function offsetSentence(offsetYears: number | null): string | null {
  if (offsetYears == null) return null;
  const years = Math.abs(offsetYears).toFixed(1);
  if (offsetYears > CIRCUM_BAND_YEARS) return `Pasaron ${years} años del PHV`;
  if (offsetYears < -CIRCUM_BAND_YEARS) return `Faltan ${years} años para el PHV`;
  return 'PHV en curso';
}

/**
 * Construye el informe de madurez para una valoración.
 *
 * Recibe la edad ya calculada (decimal, no redondeada) en vez de las fechas: así
 * este módulo queda puro y sin dependencias, y la zona horaria del centro se
 * resuelve una sola vez en `scales.yearsBetween`.
 *
 * Nunca lanza: si faltan medidas, cada método explica cuáles.
 */
export function buildMaturityReport(
  sex: Sex,
  age: number | null,
  anthropometry: Anthropometry | null | undefined,
): MaturityReport {
  const height = toCm(positive(anthropometry?.estaturaCm));
  const sittingHeight = toCm(positive(anthropometry?.estaturaSentadoCm));
  const weight = positive(anthropometry?.pesoKg);

  const toMethod = (
    key: MethodKey,
    label: string,
    reference: string,
    standardError: number,
    missing: string[],
    compute: () => number | null,
  ): MaturityMethod => {
    const unavailable = UNAVAILABLE[key];
    if (unavailable) {
      return { key, label, reference, offsetYears: null, ageAtPhv: null, standardError, missing: [], unavailable };
    }
    if (age == null) {
      return { key, label, reference, offsetYears: null, ageAtPhv: null, standardError, missing: ['fecha de nacimiento'] };
    }
    if (age < VALID_AGE_MIN || age > VALID_AGE_MAX) {
      return {
        key,
        label,
        reference,
        offsetYears: null,
        ageAtPhv: null,
        standardError,
        missing: [],
        unavailable: `No aplica a ${age.toFixed(0)} años: la ecuación se validó entre los ${VALID_AGE_MIN} y los ${VALID_AGE_MAX}.`,
      };
    }
    if (missing.length > 0) {
      return { key, label, reference, offsetYears: null, ageAtPhv: null, standardError, missing };
    }
    const offsetYears = compute();
    return {
      key,
      label,
      reference,
      offsetYears,
      ageAtPhv: offsetYears == null ? null : age - offsetYears,
      standardError,
      // `compute` devuelve null solo ante medidas incoherentes (talla sentado ≥ estatura).
      missing: offsetYears == null ? ['medidas coherentes de estatura y estatura sentado'] : [],
    };
  };

  // Moore en varones acepta estatura sentado O estatura; en mujeres solo estatura.
  const mooreMissing =
    sex === 'F'
      ? height == null
        ? ['estatura']
        : []
      : sittingHeight == null && height == null
        ? ['estatura sentado o estatura']
        : [];

  const mirwaldMissing = [
    height == null ? 'estatura' : null,
    sittingHeight == null ? 'estatura sentado' : null,
    weight == null ? 'peso' : null,
  ].filter((item): item is string => item != null);

  const methods: MaturityMethod[] = [
    toMethod('moore', 'Moore', 'Moore et al. (2015)', 0.48, mooreMissing, () =>
      mooreOffset(sex, age as number, height, sittingHeight),
    ),
    toMethod('mirwald', 'Mirwald', 'Mirwald et al. (2002)', 0.59, mirwaldMissing, () =>
      mirwaldOffset(sex, age as number, height as number, sittingHeight as number, weight as number),
    ),
    toMethod('fransen', 'Fransen', 'Fransen et al. (2018)', 0.52, [], () => null),
    toMethod('khamisRoche', 'Khamis-Roche', 'Khamis-Roche (1994)', 2.5, [], () => null),
  ];

  // Mirwald manda por ser la ecuación de referencia; Moore cubre cuando falta peso
  // o talla sentado. Así la barra de biobanding sigue apareciendo con menos datos.
  const reference =
    methods.find((m) => m.key === 'mirwald' && m.offsetYears != null) ??
    methods.find((m) => m.key === 'moore' && m.offsetYears != null) ??
    null;

  return {
    age,
    applicable: isMaturityApplicable(age),
    methods,
    phase: phaseFromOffset(reference?.offsetYears ?? null),
    referenceOffset: reference?.offsetYears ?? null,
    referenceLabel: reference?.reference ?? null,
  };
}

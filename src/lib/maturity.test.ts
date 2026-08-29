/**
 * Regresión de las ecuaciones de madurez.
 *
 * El caso de referencia es el informe biométrico impreso de un atleta de 15.16
 * años (181 cm / 92 cm sentado / 69 kg), donde Moore y Mirwald dan ambos 13.48
 * de edad al PHV. Que dos ecuaciones distintas coincidan al centésimo es una
 * casualidad de este atleta concreto, no un error: los offsets difieren
 * (1.6826 vs 1.6756) y solo empatan al redondear.
 *
 * Se ejecuta con el runner nativo: `npm test`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildMaturityReport,
  mirwaldOffset,
  mooreOffset,
  offsetSentence,
  phaseFromOffset,
} from './maturity.ts';

const CARLOS = { sex: 'M' as const, age: 15.16, height: 181, sittingHeight: 92, weight: 69 };

test('Mirwald 2002 reproduce la edad al PHV del informe de referencia', () => {
  const offset = mirwaldOffset(CARLOS.sex, CARLOS.age, CARLOS.height, CARLOS.sittingHeight, CARLOS.weight);
  assert.ok(offset != null);
  assert.equal(offset.toFixed(4), '1.6756');
  assert.equal((CARLOS.age - offset).toFixed(2), '13.48');
});

test('Moore 2015 reproduce la edad al PHV del informe de referencia', () => {
  const offset = mooreOffset(CARLOS.sex, CARLOS.age, CARLOS.height, CARLOS.sittingHeight);
  assert.ok(offset != null);
  assert.equal(offset.toFixed(4), '1.6826');
  assert.equal((CARLOS.age - offset).toFixed(2), '13.48');
});

test('Moore usa la variante de estatura cuando falta la talla sentado', () => {
  const conEstatura = mooreOffset('M', CARLOS.age, CARLOS.height, null);
  assert.ok(conEstatura != null);
  assert.equal((CARLOS.age - conEstatura).toFixed(2), '13.25');
  // Sin ninguna de las dos medidas no hay nada que estimar.
  assert.equal(mooreOffset('M', CARLOS.age, null, null), null);
});

test('Mirwald rechaza medidas incoherentes (talla sentado ≥ estatura)', () => {
  assert.equal(mirwaldOffset('M', 15.16, 180, 180, 69), null);
  assert.equal(mirwaldOffset('M', 15.16, 180, 185, 69), null);
});

test('las fases de biobanding parten el offset en ±1 año', () => {
  assert.equal(phaseFromOffset(-1.5), 'pre');
  assert.equal(phaseFromOffset(-1), 'circum');
  assert.equal(phaseFromOffset(0), 'circum');
  assert.equal(phaseFromOffset(1), 'circum');
  assert.equal(phaseFromOffset(1.68), 'post');
  assert.equal(phaseFromOffset(null), null);
});

test('la lectura en texto describe el lado del PHV', () => {
  assert.equal(offsetSentence(1.68), 'Pasaron 1.7 años del PHV');
  assert.equal(offsetSentence(-2.3), 'Faltan 2.3 años para el PHV');
  assert.equal(offsetSentence(0.4), 'PHV en curso');
});

test('el informe completo marca POST-PHV para el caso de referencia', () => {
  const report = buildMaturityReport('M', CARLOS.age, {
    estaturaCm: CARLOS.height,
    estaturaSentadoCm: CARLOS.sittingHeight,
    pesoKg: CARLOS.weight,
  });
  assert.equal(report.phase, 'post');
  assert.equal(report.referenceOffset?.toFixed(4), '1.6756');

  const byKey = Object.fromEntries(report.methods.map((m) => [m.key, m]));
  assert.equal(byKey.mirwald.ageAtPhv?.toFixed(2), '13.48');
  assert.equal(byKey.moore.ageAtPhv?.toFixed(2), '13.48');
  // Los dos métodos sin verificar se declaran no disponibles, nunca estimados.
  assert.ok(byKey.fransen.unavailable);
  assert.ok(byKey.khamisRoche.unavailable);
  assert.equal(byKey.fransen.ageAtPhv, null);
});

test('cuando faltan medidas cada método dice cuáles, sin inventar valores', () => {
  const report = buildMaturityReport('M', CARLOS.age, { estaturaCm: CARLOS.height });
  const byKey = Object.fromEntries(report.methods.map((m) => [m.key, m]));

  assert.deepEqual(byKey.mirwald.missing, ['estatura sentado', 'peso']);
  assert.equal(byKey.mirwald.ageAtPhv, null);
  // Moore sigue funcionando solo con la estatura, así que la barra no desaparece.
  assert.equal(byKey.moore.missing.length, 0);
  assert.equal(report.phase, 'post');
  assert.equal(report.referenceLabel, 'Moore et al. (2015)');
});

test('fuera del rango validado (8-18) no se estima nada', () => {
  const medidas = { estaturaCm: 165, estaturaSentadoCm: 88, pesoKg: 62 };

  for (const edad of [42, 7.5, 25]) {
    const report = buildMaturityReport('M', edad, medidas);
    assert.equal(report.applicable, false, `edad ${edad} no debería ser aplicable`);
    assert.equal(report.phase, null, `edad ${edad} no debería producir fase`);
    assert.equal(report.referenceOffset, null);
    for (const method of report.methods) {
      assert.equal(method.ageAtPhv, null);
      assert.ok(method.unavailable, `${method.key} debería declararse no aplicable a los ${edad}`);
    }
  }

  // Los extremos del rango sí se calculan.
  assert.ok(buildMaturityReport('M', 8, medidas).phase);
  assert.ok(buildMaturityReport('M', 18, medidas).phase);
});

test('una estatura guardada en metros se normaliza a centímetros', () => {
  // Caso real de la base: la mitad de las valoraciones guardan metros en `estaturaCm`.
  const enMetros = buildMaturityReport('M', 12, { estaturaCm: 1.58, estaturaSentadoCm: 75, pesoKg: 54.85 });
  const enCm = buildMaturityReport('M', 12, { estaturaCm: 158, estaturaSentadoCm: 75, pesoKg: 54.85 });

  assert.equal(enMetros.referenceOffset, enCm.referenceOffset);
  assert.equal(enMetros.phase, enCm.phase);
  // Sin normalizar, la talla sentado superaría a la estatura y Mirwald sería null.
  assert.ok(enMetros.referenceOffset != null);
});

test('sin fecha de nacimiento no se estima nada', () => {
  const report = buildMaturityReport('M', null, { estaturaCm: 181, estaturaSentadoCm: 92, pesoKg: 69 });
  assert.equal(report.phase, null);
  assert.deepEqual(report.methods[0].missing, ['fecha de nacimiento']);
});

test('mujeres usan la ecuación de estatura en Moore y la suya en Mirwald', () => {
  const offset = mooreOffset('F', 12, 150, 80);
  assert.ok(offset != null);
  // Ronda el PHV femenino (~12 años), muy por delante del masculino.
  assert.ok(Math.abs(12 - offset - 12.1) < 0.2, `APHV inesperada: ${12 - offset}`);
  assert.notEqual(mirwaldOffset('F', 12, 150, 80, 42), mirwaldOffset('M', 12, 150, 80, 42));
});

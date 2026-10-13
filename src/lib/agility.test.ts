/**
 * Puntaje de agilidad por test. Los casos son tiempos reales de las fichas
 * (ver public/propuestas/agilidad.html). Se ejecuta con `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAgility, resolveAgilityTest } from './agility.ts';

test('5-10-5: 4.3 s = 100, 6.0 s = 0, lineal entre ambos', () => {
  assert.equal(normalizeAgility(4.3, '5-10-5'), 100);
  assert.equal(normalizeAgility(6.0, '5-10-5'), 0);
  assert.equal(normalizeAgility(5.25, '5-10-5'), 44);
  assert.equal(normalizeAgility(4.4, '5-10-5'), 94);
  assert.equal(normalizeAgility(6.23, '5-10-5'), 0);
});

test('5-0-5 conserva su escala: 3.52 s = 6', () => {
  assert.equal(normalizeAgility(3.52, '5-0-5'), 6);
  assert.equal(normalizeAgility(2.2, '5-0-5'), 100);
});

test('sin tiempo = 0', () => {
  assert.equal(normalizeAgility(null, '5-10-5'), 0);
  assert.equal(normalizeAgility(0, '5-0-5'), 0);
});

test('el test guardado manda sobre el tiempo', () => {
  assert.equal(resolveAgilityTest('5-0-5', 5.2), '5-0-5');
  assert.equal(resolveAgilityTest('5-10-5', 3.5), '5-10-5');
});

test('fichas antiguas sin test: se deduce por el tiempo, la etiqueta libre se ignora', () => {
  assert.equal(resolveAgilityTest(undefined, 5.25), '5-10-5');
  assert.equal(resolveAgilityTest('505', 4.84), '5-10-5');
  assert.equal(resolveAgilityTest(undefined, 3.52), '5-0-5');
  assert.equal(resolveAgilityTest(undefined, null), '5-10-5');
});

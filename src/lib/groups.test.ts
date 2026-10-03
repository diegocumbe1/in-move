/**
 * Reglas puras del módulo de grupos. Se ejecuta con el runner nativo: `npm test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PLAN_LIMITS,
  activeGroupsProblem,
  capacityProblem,
  effectiveCapacity,
  limitState,
  mirrorGroupName,
  rankAthletes,
  slugify,
} from './groups.ts';
import type { Athlete, Assessment, RadarMetric } from './mock-product.ts';

test('slugify colapsa grafías del mismo nombre al mismo slug', () => {
  assert.equal(slugify('Running'), 'running');
  assert.equal(slugify('  running  '), 'running');
  assert.equal(slugify('RUNNING'), 'running');
  assert.equal(slugify('Garzón Élite'), 'garzon-elite');
  assert.equal(slugify('Sub-15 / Fútbol'), 'sub-15-futbol');
});

test('slugify mantiene distintos los nombres que sí son distintos', () => {
  assert.notEqual(slugify('Coofisam'), slugify('Cofisam'));
});

test('limitState avisa al 80% y bloquea al 100%', () => {
  assert.equal(limitState(5, 8), 'ok');
  assert.equal(limitState(7, 8), 'warning');
  assert.equal(limitState(8, 8), 'full');
  assert.equal(limitState(9, 8), 'full');
});

test('el cupo efectivo nunca supera el límite del plan', () => {
  const on = { ...DEFAULT_PLAN_LIMITS, enabled: true };
  assert.equal(effectiveCapacity(null, on), 40);
  assert.equal(effectiveCapacity(25, on), 25);
  assert.equal(effectiveCapacity(100, on), 40);
});

test('capacityProblem rechaza solo cuando se pasa del cupo', () => {
  const on = { ...DEFAULT_PLAN_LIMITS, enabled: true };
  const group = { name: 'Coofisam', capacity: 3, memberIds: ['a', 'b'] };
  assert.equal(capacityProblem(group, 1, on), null);
  assert.match(capacityProblem(group, 2, on) ?? '', /cupo para 3/);
});

test('con los límites apagados no hay tope de plan, pero sí el cupo propio', () => {
  const off = { ...DEFAULT_PLAN_LIMITS, enabled: false };
  assert.equal(effectiveCapacity(null, off), null);
  assert.equal(effectiveCapacity(100, off), 100);
  assert.equal(activeGroupsProblem(50, off), null);
  assert.equal(capacityProblem({ name: 'Coofisam', capacity: null, memberIds: ['a'] }, 500, off), null);
  assert.match(capacityProblem({ name: 'Coofisam', capacity: 2, memberIds: ['a', 'b'] }, 1, off) ?? '', /cupo para 2/);
});

test('activeGroupsProblem bloquea el grupo 9 con el plan por defecto', () => {
  const on = { ...DEFAULT_PLAN_LIMITS, enabled: true };
  assert.equal(activeGroupsProblem(7, on), null);
  assert.match(activeGroupsProblem(8, on) ?? '', /8 grupos activos/);
});

test('el espejo athletes.group es estable y vacío sin grupos', () => {
  assert.equal(mirrorGroupName(['Running', 'Coofisam']), 'Coofisam');
  assert.equal(mirrorGroupName([]), null);
});

// ── Ranking ──

const radar = (jumpScore: number, jumpRaw: string): RadarMetric[] => [
  { key: 'strength', label: 'Fuerza', shortLabel: 'Fuerza', score: 0, team: 70, raw: 'Sin dato', source: '' },
  { key: 'speed', label: 'Velocidad', shortLabel: 'Velocidad', score: 0, team: 68, raw: 'Sin dato', source: '' },
  { key: 'agility', label: 'Agilidad', shortLabel: 'Agilidad', score: 0, team: 66, raw: 'Sin dato', source: '' },
  { key: 'jump', label: 'Salto', shortLabel: 'Salto', score: jumpScore, team: 61, raw: jumpRaw, source: '' },
];

const athlete = (name: string, assessment?: Partial<Assessment>): Athlete => ({
  id: name,
  name,
  code: '00000000',
  document: '0',
  birthDate: '2010-01-01',
  sex: 'M',
  category: 'Personalizado',
  group: '',
  sport: '',
  position: '',
  status: 'good',
  statusLabel: '',
  assessments: assessment
    ? [{ id: `f-${name}`, date: '2026-09-01', score: 50, radar: radar(0, 'Sin dato'), metrics: [], ...assessment }]
    : [{ date: '2026-09-01', score: 0, radar: radar(0, 'Sin dato'), metrics: [] }],
});

test('el ranking deja fuera a quien no tiene ficha o no tiene el dato', () => {
  const ana = athlete('Ana', { radar: radar(80, '40.0 cm (prom.)') });
  const beto = athlete('Beto', { radar: radar(60, '30.0 cm (prom.)') });
  const sinDato = athlete('Carla', { radar: radar(0, 'Sin dato') });
  const sinFicha = athlete('Dario');

  const { rows, withoutData } = rankAthletes([beto, sinDato, ana, sinFicha], 'jump');
  assert.deepEqual(rows.map((row) => row.athlete.name), ['Ana', 'Beto']);
  assert.deepEqual(rows.map((row) => row.position), [1, 2]);
  assert.deepEqual(withoutData.map((a) => a.name).sort(), ['Carla', 'Dario']);
});

test('los empates comparten posición', () => {
  const { rows } = rankAthletes(
    [athlete('Ana', { score: 70 }), athlete('Beto', { score: 70 }), athlete('Carla', { score: 50 })],
    'score',
  );
  assert.deepEqual(rows.map((row) => row.position), [1, 1, 3]);
});

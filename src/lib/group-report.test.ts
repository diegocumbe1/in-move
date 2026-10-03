/**
 * Ficha grupal: agregados y regla de privacidad. `npm test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MIN_SAMPLE, summarizeGroup } from './group-report.ts';
import type { Assessment, Athlete, RadarMetric, ScaleMetric } from './mock-product.ts';

const radar = (jump: number): RadarMetric[] => [
  { key: 'strength', label: 'Fuerza', shortLabel: 'Fuerza', score: 0, team: 70, raw: 'Sin dato', source: '' },
  { key: 'speed', label: 'Velocidad', shortLabel: 'Velocidad', score: 0, team: 68, raw: 'Sin dato', source: '' },
  { key: 'agility', label: 'Agilidad', shortLabel: 'Agilidad', score: 0, team: 66, raw: 'Sin dato', source: '' },
  { key: 'jump', label: 'Salto', shortLabel: 'Salto', score: jump, team: 61, raw: `${jump} cm`, source: '' },
];

const fatMetric = (level: ScaleMetric['level']): ScaleMetric => ({ label: 'Grasa corporal', value: 0, unit: '%', level, levelLabel: '', range: '' });

function ficha(id: string, date: string, cmj: number | null, fat: number | null, fatLevel: ScaleMetric['level'] = 'good'): Assessment {
  return {
    id,
    date,
    score: 50,
    radar: radar(cmj ?? 0),
    metrics: [fatMetric(fatLevel)],
    raw: { performance: cmj == null ? null : { cmjCm: cmj }, anthropometry: fat == null ? null : { pctGrasa: fat } },
  } as Assessment;
}

function athlete(name: string, sex: 'M' | 'F', birthDate: string, fichas: Assessment[], status: Athlete['status'] = 'good'): Athlete {
  return {
    id: name,
    name,
    code: '12345678',
    document: `doc-${name}`,
    birthDate,
    sex,
    category: 'Semi personalizado',
    group: 'Coofisam',
    sport: '',
    position: '',
    status,
    statusLabel: status === 'danger' ? 'Alerta' : 'Optimo',
    assessments: fichas.length ? fichas : [{ date: '2026-09-01', score: 0, radar: radar(0), metrics: [] }],
  };
}

const TODAY = '2026-09-30';

const members = [
  athlete('Ana Pérez', 'F', '2012-05-01', [ficha('a2', '2026-09-01', 30, 18), ficha('a1', '2026-06-01', 27, 20)]),
  athlete('Beto Ruiz', 'M', '2011-02-01', [ficha('b2', '2026-09-02', 36, 12, 'elite'), ficha('b1', '2026-06-02', 33, 13)], 'danger'),
  athlete('Carla Díaz', 'F', '2013-08-01', [ficha('c2', '2026-09-03', 24, 22, 'warning'), ficha('c1', '2026-06-03', 24, 23)]),
  athlete('Dario Gómez', 'M', '2010-01-01', []),
];

test('la ficha grupal no expone nombres, documentos ni ids de deportistas', () => {
  const json = JSON.stringify(summarizeGroup(members, TODAY));
  for (const member of members) {
    assert.ok(!json.includes(member.name), `aparece ${member.name}`);
    assert.ok(!json.includes(member.document), `aparece ${member.document}`);
    for (const assessment of member.assessments) {
      if (assessment.id) assert.ok(!json.includes(`"${assessment.id}"`), `aparece la ficha ${assessment.id}`);
    }
  }
});

test('promedia la última ficha de cada uno e ignora a quien no tiene dato', () => {
  const report = summarizeGroup(members, TODAY);
  assert.equal(report.members, 4);
  assert.equal(report.withAssessment, 3);
  assert.equal(report.lastAssessedOn, '2026-09-03');
  const cmj = report.indicators.find((indicator) => indicator.key === 'cmj')!;
  assert.equal(cmj.n, 3);
  assert.equal(cmj.average, 30); // (30 + 36 + 24) / 3
});

test(`con menos de ${MIN_SAMPLE} datos no se muestra el promedio`, () => {
  const report = summarizeGroup(members.slice(0, 2), TODAY);
  const cmj = report.indicators.find((indicator) => indicator.key === 'cmj')!;
  assert.equal(cmj.n, 2);
  assert.equal(cmj.average, null);
  assert.deepEqual(report.trafficLights.find((light) => light.label === 'Grasa corporal')!.pct, {});
  assert.equal(report.evolution.length, 0);
});

test('semáforo grupal en porcentajes y alertas como conteo', () => {
  const report = summarizeGroup(members, TODAY);
  const fat = report.trafficLights.find((light) => light.label === 'Grasa corporal')!;
  assert.deepEqual(fat.pct, { warning: 33, good: 33, elite: 33 });
  assert.deepEqual(report.alerts, { alert: 1, followUp: 0 });
});

test('evolución entre la ficha anterior y la última', () => {
  const report = summarizeGroup(members, TODAY);
  const cmj = report.evolution.find((item) => item.key === 'cmj')!;
  assert.equal(cmj.previous, 28); // (27 + 33 + 24) / 3
  assert.equal(cmj.latest, 30);
  assert.equal(cmj.deltaPct, 7.1);
});

test('composición por sexo, edad y categoría', () => {
  const report = summarizeGroup(members, TODAY);
  assert.deepEqual(report.composition.sex, { M: 2, F: 2 });
  // Al 2026-09-30: Ana 14, Carla 13 · Beto 15, Dario 16. Las franjas vacías no aparecen.
  assert.deepEqual(report.composition.ages, [
    { label: '12 a 14', count: 2 },
    { label: '15 a 17', count: 2 },
  ]);
  assert.deepEqual(report.composition.categories, [{ label: 'Semi personalizado', count: 4 }]);
});

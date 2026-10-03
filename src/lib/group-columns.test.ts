/**
 * Tabla general y ranking público del grupo. `npm test`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_GROUP_PUBLIC_SETTINGS,
  GROUP_COLUMN_KEYS,
  MIN_PUBLIC_RANKING,
  buildPublicRanking,
  compareCells,
  groupTableEnabled,
  parseGroupPublicSettings,
  rankByScore,
  scoreCell,
  type GroupCells,
} from './group-columns.ts';
import type { Assessment, Athlete } from './mock-product.ts';

function athlete(name: string, score: number | null): Athlete {
  const assessments: Assessment[] =
    score == null
      ? [{ date: '2026-09-01', score: 0, radar: [], metrics: [] }]
      : [{ id: `f-${name}`, date: '2026-09-01', score, radar: [], metrics: [] }];
  return {
    id: name,
    name,
    code: '12345678',
    document: `doc-${name}`,
    birthDate: '2012-01-01',
    sex: 'M',
    category: '',
    group: '',
    sport: '',
    position: '',
    photoUrl: `https://fotos/${name}.jpg`,
    status: 'good',
    statusLabel: 'Optimo',
    assessments,
  } as Athlete;
}

const cellsFor = (member: Athlete, assessment: Assessment): GroupCells =>
  Object.fromEntries(GROUP_COLUMN_KEYS.map((key) => [key, scoreCell(assessment.score, `${member.name}:${key}`)])) as GroupCells;

const members = [athlete('Ana', 70), athlete('Beto', 85), athlete('Carla', 70), athlete('Dario', null)];

test('rankByScore ordena por score, comparte posición en empates y deja fuera a quien no tiene ficha', () => {
  const { ranked, withoutAssessment } = rankByScore(members);
  assert.deepEqual(ranked.map((row) => [row.athlete.name, row.position]), [['Beto', 1], ['Ana', 2], ['Carla', 2]]);
  assert.deepEqual(withoutAssessment.map((row) => row.name), ['Dario']);
});

test('con nombres apagados el ranking público no lleva nombres, fotos ni documentos', () => {
  const ranking = buildPublicRanking(members, { ...DEFAULT_GROUP_PUBLIC_SETTINGS, identity: 'none', columns: ['score'] }, (member, assessment) => ({
    ...cellsFor(member, assessment),
    score: scoreCell(assessment.score, `${assessment.score}/100`),
  }));
  const json = JSON.stringify(ranking);
  for (const member of members) {
    assert.ok(!json.includes(member.name), `aparece ${member.name}`);
    assert.ok(!json.includes(member.document), `aparece ${member.document}`);
  }
  assert.ok(ranking.rows.every((row) => row.name === null && row.photoUrl === null));
});

test('el ranking público muestra solo nombre, solo foto o ambos según la configuración', () => {
  const both = buildPublicRanking(members, { ...DEFAULT_GROUP_PUBLIC_SETTINGS, identity: 'both', columns: ['score'] }, cellsFor);
  assert.deepEqual(both.rows.map((row) => row.name), ['Beto', 'Ana', 'Carla']);
  assert.ok(both.rows.every((row) => row.photoUrl));

  const nameOnly = buildPublicRanking(members, { ...DEFAULT_GROUP_PUBLIC_SETTINGS, identity: 'name', columns: ['score'] }, cellsFor);
  assert.ok(nameOnly.rows.every((row) => row.name && row.photoUrl === null));

  const photoOnly = buildPublicRanking(members, { ...DEFAULT_GROUP_PUBLIC_SETTINGS, identity: 'photo', columns: ['score'] }, (_member, assessment) =>
    Object.fromEntries(GROUP_COLUMN_KEYS.map((key) => [key, scoreCell(assessment.score, '')])) as GroupCells,
  );
  assert.ok(photoOnly.rows.every((row) => row.name === null && row.photoUrl));
  assert.ok(!JSON.stringify(photoOnly).includes('"Ana"'));
});

test('el ranking público solo incluye las columnas configuradas', () => {
  const ranking = buildPublicRanking(members, { ...DEFAULT_GROUP_PUBLIC_SETTINGS, identity: 'both', columns: ['jump', 'speed'] }, cellsFor);
  for (const row of ranking.rows) assert.deepEqual(Object.keys(row.cells), ['jump', 'speed']);
  assert.ok(!JSON.stringify(ranking).includes(':fat'));
});

test(`con menos de ${MIN_PUBLIC_RANKING} deportistas valorados no se publica el ranking`, () => {
  const ranking = buildPublicRanking([athlete('Ana', 70), athlete('Beto', 80)], DEFAULT_GROUP_PUBLIC_SETTINGS, cellsFor);
  assert.equal(ranking.rows.length, 0);
});

test('parseGroupPublicSettings: por defecto sin nombres y sin medidas corporales; descarta claves desconocidas', () => {
  assert.deepEqual(parseGroupPublicSettings(null), DEFAULT_GROUP_PUBLIC_SETTINGS);
  assert.ok(!DEFAULT_GROUP_PUBLIC_SETTINGS.columns.includes('fat'));
  assert.deepEqual(
    parseGroupPublicSettings('{"identity":"photo","columns":["hr","nope","score"],"adminColumns":["jump"],"excludedGroupIds":["g1",3]}'),
    { identity: 'photo', columns: ['score', 'hr'], adminColumns: ['jump'], excludedGroupIds: ['g1'] },
  );
  // Configuración guardada antes de existir adminColumns/excludedGroupIds: todo el panel visible, ningún grupo excluido.
  // El interruptor anterior "nombres y fotos" se lee como 'both'.
  assert.equal(parseGroupPublicSettings('{"showNames":true}').identity, 'both');
  assert.equal(parseGroupPublicSettings('{"identity":"raro"}').identity, 'none');
  const legacy = parseGroupPublicSettings('{"showNames":false,"columns":["score"]}');
  assert.deepEqual(legacy.adminColumns, GROUP_COLUMN_KEYS);
  assert.deepEqual(legacy.excludedGroupIds, []);
  assert.deepEqual(parseGroupPublicSettings('no es json'), DEFAULT_GROUP_PUBLIC_SETTINGS);
});

test('un grupo excluido no publica ranking', () => {
  const settings = { ...DEFAULT_GROUP_PUBLIC_SETTINGS, excludedGroupIds: ['g1'] };
  assert.equal(groupTableEnabled(settings, 'g1'), false);
  assert.equal(groupTableEnabled(settings, 'g2'), true);
  const ranking = buildPublicRanking(members, settings, cellsFor, groupTableEnabled(settings, 'g1'));
  assert.equal(ranking.enabled, false);
  assert.equal(ranking.rows.length, 0);
});

test('scoreCell ubica el puntaje en su banda', () => {
  assert.equal(scoreCell(39, '').levelLabel, 'Bajo');
  assert.equal(scoreCell(40, '').levelLabel, 'Medio');
  assert.equal(scoreCell(79, '').levelLabel, 'Óptimo');
  assert.equal(scoreCell(80, '').activeIndex, 3);
});

test('compareCells respeta qué es mejor y deja sin dato al final', () => {
  const low = scoreCell(10, '');
  const high = scoreCell(90, '');
  assert.ok(compareCells(high, low, 'higher') < 0);
  assert.ok(compareCells(low, high, 'lower') < 0);
  assert.ok(compareCells(null, low, 'higher') > 0);
});

import { buildComparison, type IndicatorComparison } from '@/lib/comparison';
import { scoreCell, type GroupCells, type ScaleCell } from '@/lib/group-columns';
import type { Assessment, Athlete, RadarKey } from '@/lib/mock-product';

/**
 * Celdas de la tabla general del grupo para un deportista. Las medidas con
 * baremo (IMC, grasa, masa, FC, sit & reach, CMJ) usan las mismas bandas que la
 * pestaña "Comparación" de la ficha; los ejes del radar y el score, la escala 0–100.
 */
export function athleteCells(athlete: Athlete, assessment: Assessment): GroupCells {
  const age = assessment.profile?.chronologicalAge ?? null;
  const raw = assessment.raw ?? {};
  const comparisons = new Map(buildComparison(athlete.sex, age, raw).map((item) => [item.key, item]));
  const values: Record<string, number | null | undefined> = {
    bmi: raw.anthropometry?.imc,
    fat: raw.anthropometry?.pctGrasa,
    masa: raw.anthropometry?.pctMasa,
    hr: raw.cardio?.fcReposo,
    sitReach: raw.flexibility?.resultadoCm,
    cmj: raw.performance?.cmjCm,
  };

  const fromComparison = (key: string): ScaleCell | null => {
    const item = comparisons.get(key);
    const value = values[key];
    if (!item || value == null) return null;
    return bandCell(item, value);
  };

  const fromRadar = (key: RadarKey): ScaleCell | null => {
    const axis = assessment.radar.find((item) => item.key === key);
    return axis && axis.raw !== 'Sin dato' ? scoreCell(axis.score, axis.raw.replace(' (prom.)', '')) : null;
  };

  const hasRadarData = assessment.radar.some((axis) => axis.raw !== 'Sin dato');

  return {
    score: hasRadarData ? scoreCell(assessment.score, `${assessment.score}/100`) : null,
    jump: fromRadar('jump'),
    cmj: fromComparison('cmj'),
    strength: fromRadar('strength'),
    speed: fromRadar('speed'),
    agility: fromRadar('agility'),
    sitReach: fromComparison('sitReach'),
    fat: fromComparison('fat'),
    masa: fromComparison('masa'),
    bmi: fromComparison('bmi'),
    hr: fromComparison('hr'),
  };
}

function bandCell(item: IndicatorComparison, value: number): ScaleCell {
  const activeIndex = item.bands.findIndex((band) => band.active);
  return {
    display: item.valueLabel,
    value,
    level: item.status?.level ?? null,
    levelLabel: item.status?.label ?? 'Sin baremo',
    bands: item.bands.map(({ label, level }) => ({ label, level })),
    activeIndex,
  };
}

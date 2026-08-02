'use client';

import { Fragment, useState } from 'react';
import Image from 'next/image';
import type { Anthropometry, Cardio, Flexibility, Performance, Rom, FichaSectionKey } from '@/lib/ficha';
import { biologicalAge } from '@/lib/scales';

/**
 * Documento de la FICHA DE VALORACIÓN IN MOVE — branding verde, estructurado
 * como la plantilla del centro (img/ficha1.jpeg). Colores explícitos (siempre
 * claro) para verse igual en pantalla pública y en el PDF impreso.
 */

export type FichaData = {
  name: string;
  document: string;
  birthDate: string;
  sex: 'M' | 'F';
  code: string;
  category?: string | null;
  group?: string | null;
  sport?: string | null;
  photoUrl?: string | null;
  assessedOn: string;
  updatedAt?: string | null;
  age: number | null;
  anthropometry?: Anthropometry | null;
  cardio?: Cardio | null;
  rom?: Rom | null;
  flexibility?: Flexibility | null;
  performance?: Performance | null;
  observations?: string | null;
  plan?: string | null;
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  if (iso.includes('T')) {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(new Date(iso));
  }
  const [date] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};
const val = (v: number | string | null | undefined, suffix = '') =>
  v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-[var(--fc-line)]">
      <span className="flex w-2/5 items-center bg-[var(--fc-label-bg)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--fc-label-ink)]">
        {label}
      </span>
      <span className="flex flex-1 items-center bg-[var(--fc-card)] px-3 py-2 text-sm font-semibold text-[var(--fc-ink)]">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--fc-accent)]">{children}</h2>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--fc-line)] bg-[var(--fc-card)]">
      <div className="bg-[var(--fc-label-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--fc-label-ink)]">{label}</div>
      <div className="px-3 py-2 text-lg font-bold text-[var(--fc-ink)]">{value}</div>
    </div>
  );
}

function JointCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--fc-line)] bg-[var(--fc-card)]">
      <div className="bg-green-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/** Tarjeta de un levantamiento (Sentadilla / Press banca): cada medida en su casilla. */
function LiftCard({
  title,
  cargaKg,
  vmMs,
  potenciaW,
  rmKg,
  pct,
}: {
  title: string;
  cargaKg?: number | null;
  vmMs?: number | null;
  potenciaW?: number | null;
  rmKg?: number | null;
  pct?: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--fc-line)] bg-[var(--fc-card)]">
      <div className="bg-green-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">{title}</div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        <Metric label="Carga (kg)" value={val(cargaKg)} />
        <Metric label="Vel. media (m/s)" value={val(vmMs)} />
        <Metric label="Potencia (W)" value={val(potenciaW)} />
        <Metric label="1RM (kg)" value={val(rmKg)} />
        <Metric label="% 1RM" value={val(pct, ' %')} />
      </div>
    </div>
  );
}

function AthletePhoto({ src, alt }: { src?: string | null; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-lg border-2 border-[var(--fc-line)] bg-[var(--fc-card-2)] shadow-sm">
      {src ? (
        <>
          {!loaded ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-green-100 via-white to-green-50" aria-hidden /> : null}
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(min-width: 640px) 240px, calc(100vw - 2rem)"
            className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        <span className="text-sm text-[var(--fc-accent)]">Sin foto</span>
      )}
    </div>
  );
}

/** Tarjeta ROM unilateral (ej. Columna: flexión/extensión). */
function SingleJoint({ title, rows }: { title: string; rows: { label: string; value?: number | null }[] }) {
  return (
    <JointCard title={title}>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-[var(--fc-muted)]">{row.label}</span>
            <span className="font-bold tabular-nums text-[var(--fc-ink)]">{val(row.value, '°')}</span>
          </div>
        ))}
      </div>
    </JointCard>
  );
}

/** Tarjeta ROM bilateral con columnas Izq/Der y aviso de asimetría (≥10°). */
function BilateralJoint({ title, rows }: { title: string; rows: { label: string; izq?: number | null; der?: number | null }[] }) {
  return (
    <JointCard title={title}>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1.5">
        <span />
        <span className="text-center text-[10px] font-bold uppercase text-[var(--fc-muted)]">Izq</span>
        <span className="text-center text-[10px] font-bold uppercase text-[var(--fc-muted)]">Der</span>
        {rows.map((row) => {
          const asym = row.izq != null && row.der != null && Math.abs(row.izq - row.der) >= 10;
          return (
            <Fragment key={row.label}>
              <span className="flex items-center gap-1.5 text-sm text-[var(--fc-muted)]">
                {row.label}
                {asym ? <span className="size-1.5 rounded-full bg-amber-500" title="Asimetría" /> : null}
              </span>
              <span className="text-center text-sm font-bold tabular-nums text-[var(--fc-ink)]">{val(row.izq)}</span>
              <span className="text-center text-sm font-bold tabular-nums text-[var(--fc-ink)]">{val(row.der)}</span>
            </Fragment>
          );
        })}
      </div>
    </JointCard>
  );
}

export function FichaDocument({ data, sections }: { data: FichaData; sections?: FichaSectionKey[] }) {
  const a = data.anthropometry ?? {};
  const c = data.cardio ?? {};
  const r = data.rom ?? {};
  const f = data.flexibility ?? {};
  const p = data.performance ?? {};

  // Sin config (undefined) = mostrar todo; con config, solo las secciones habilitadas.
  const show = (key: FichaSectionKey) => !sections || sections.includes(key);

  const imc = a.imc ?? null;
  const bioAge = biologicalAge(data.sex, data.birthDate, data.assessedOn, a.estaturaCm, a.estaturaSentadoCm, a.pesoKg);
  return (
    <div className="mx-auto w-full max-w-[900px] rounded-2xl border-2 border-green-600 bg-[var(--fc-card)] p-4 text-[var(--fc-ink)] md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-lg bg-green-700 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="In Move" className="size-14 shrink-0 rounded-full bg-[var(--fc-card)] object-cover ring-2 ring-white/40" />
        <h1 className="flex-1 text-center text-lg font-extrabold uppercase tracking-wide text-white md:text-xl">
          Ficha de Valoración In Move
        </h1>
        <span className="size-14 shrink-0" aria-hidden />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_240px]">
        <div className="grid gap-1.5">
          <Field label="Nombre del deportista" value={data.name} />
          <Field label="Documento de identidad" value={data.document} />
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Field label="Fecha de nacimiento" value={fmtDate(data.birthDate)} />
            <Field label="Edad" value={data.age == null ? '—' : `${data.age} años`} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Field label="Fecha de valoración" value={fmtDate(data.assessedOn)} />
            <Field label="Código" value={data.code} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Field label="Edad biológica est." value={bioAge == null ? '—' : `${bioAge.toFixed(1)} años`} />
            <Field label="IMC" value={imc == null ? '—' : imc.toFixed(1)} />
          </div>
        </div>
        <AthletePhoto src={data.photoUrl} alt={data.name} />
      </div>

      {show('anthropometry') && (
        <>
          <SectionTitle>Indicadores de rendimiento</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Peso (kg)" value={val(a.pesoKg)} />
            <Metric label="Estatura (cm)" value={val(a.estaturaCm)} />
            <Metric label="Estatura sentado (cm)" value={val(a.estaturaSentadoCm)} />
            <Metric label="Envergadura (cm)" value={val(a.envergaduraCm)} />
            <Metric label="IMC" value={imc == null ? '—' : imc.toFixed(1)} />
            <Metric label="% Grasa" value={val(a.pctGrasa, ' %')} />
            <Metric label="% Masa corporal" value={val(a.pctMasa, ' %')} />
          </div>
        </>
      )}

      {show('rom') && (
        <>
          <SectionTitle>Movilidad articular (ROM · grados)</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <SingleJoint
              title="Columna"
              rows={[
                { label: 'Flexión', value: r.columnaFlexion },
                { label: 'Extensión', value: r.columnaExtension },
              ]}
            />
            <BilateralJoint
              title="Hombros"
              rows={[
                { label: 'Rotación interna', izq: r.hombroRotIntIzq, der: r.hombroRotIntDer },
                { label: 'Rotación externa', izq: r.hombroRotExtIzq, der: r.hombroRotExtDer },
                { label: 'Flexión', izq: r.hombroFlexionIzq, der: r.hombroFlexionDer },
              ]}
            />
            <BilateralJoint title="Cadera" rows={[{ label: 'Flexión', izq: r.caderaFlexionIzq, der: r.caderaFlexionDer }]} />
            <BilateralJoint title="Rodilla" rows={[{ label: 'Flexión', izq: r.rodillaFlexionIzq, der: r.rodillaFlexionDer }]} />
            {r.otraLabel ? <SingleJoint title={r.otraLabel} rows={[{ label: 'Valor', value: r.otraValor }]} /> : null}
          </div>
          <p className="mt-2 text-[11px] text-[var(--fc-muted)]">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" /> Asimetría izquierda/derecha ≥ 10°.
          </p>
        </>
      )}

      {show('flexibility') && (
        <>
          <SectionTitle>Flexibilidad</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Prueba aplicada" value={f.pruebaAplicada || 'Sit and Reach'} />
            <Metric label="Resultado" value={val(f.resultadoCm, ' cm')} />
            <Metric label="Observación" value={f.observacion || '—'} />
          </div>
        </>
      )}

      {show('cardio') && (
        <>
          <SectionTitle>Control cardiovascular</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-4">
            <Metric label="FC reposo (ppm)" value={val(c.fcReposo)} />
            <Metric label="FC inicial (ppm)" value={val(c.fcInicial)} />
            <Metric label="FC final (ppm)" value={val(c.fcFinal)} />
            <Metric label="FC máxima (ppm)" value={val(c.fcMax)} />
          </div>
        </>
      )}

      {show('performance') && (
        <>
          <SectionTitle>Rendimiento · Saltos</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-5">
            <Metric label="Drop Jump (cm)" value={val(p.dropJumpCm ?? p.sjCm)} />
            <Metric label="CMJ (cm)" value={val(p.cmjCm)} />
            <Metric label="Abalakov (cm)" value={val(p.abalakovCm)} />
            <Metric label="Salto unilat. I/D (cm)" value={`${val(p.saltoUnilateralIzqCm)} / ${val(p.saltoUnilateralDerCm)}`} />
            <Metric label="RSI (Dp)" value={val(p.rsi)} />
          </div>

          <SectionTitle>Rendimiento · Fuerza (encoder)</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <LiftCard
              title="Sentadilla"
              cargaKg={p.sentadillaCargaKg}
              vmMs={p.sentadillaVelocidadMediaMs}
              potenciaW={p.sentadillaPotenciaW}
              rmKg={p.sentadilla1rmKg}
              pct={p.pct1rmSentadilla}
            />
            <LiftCard
              title="Press banca"
              cargaKg={p.pressBancaCargaKg}
              vmMs={p.pressBancaVelocidadMediaMs}
              potenciaW={p.pressBancaPotenciaW}
              rmKg={p.pressBanca1rmKg}
              pct={p.pct1rmPressBanca}
            />
          </div>
        </>
      )}

      {show('speed') && (
        <>
          <SectionTitle>Velocidad y agilidad</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-4">
            <Metric label="Velocidad 10 m (s)" value={val(p.velocidad10mS)} />
            <Metric label="Velocidad 20 m (s)" value={val(p.velocidad20mS)} />
            <Metric label="Velocidad 30 m (s)" value={val(p.velocidad30mS)} />
            <Metric label={p.agilidadLabel ? `${p.agilidadLabel} (s)` : 'Test de agilidad (s)'} value={val(p.agilidad505S)} />
          </div>
        </>
      )}

      {show('observations') && (
        <>
          <SectionTitle>Observaciones generales</SectionTitle>
          <div className="min-h-[56px] rounded-md border border-[var(--fc-line)] bg-[var(--fc-card)] px-3 py-2 text-sm text-[var(--fc-ink)]">
            {data.observations || '—'}
          </div>

          <SectionTitle>Plan de intervención</SectionTitle>
          <div className="min-h-[56px] rounded-md border border-[var(--fc-line)] bg-[var(--fc-card)] px-3 py-2 text-sm text-[var(--fc-ink)]">
            {data.plan || '—'}
          </div>
        </>
      )}

      <p className="mt-5 text-center text-[11px] text-[var(--fc-accent)]">
        In Move · Centro de Evaluación y Rendimiento · Fecha valoración {fmtDate(data.updatedAt || data.assessedOn)} · Código {data.code}
      </p>
    </div>
  );
}

import type { Anthropometry, Cardio, Flexibility, Performance, Rom } from '@/lib/ficha';

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
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const val = (v: number | string | null | undefined, suffix = '') =>
  v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-green-300">
      <span className="flex w-2/5 items-center bg-green-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-green-800">
        {label}
      </span>
      <span className="flex flex-1 items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-green-700">{children}</h2>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-green-300 bg-white">
      <div className="bg-green-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-green-800">{label}</div>
      <div className="px-3 py-2 text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

export function FichaDocument({ data }: { data: FichaData }) {
  const a = data.anthropometry ?? {};
  const c = data.cardio ?? {};
  const r = data.rom ?? {};
  const f = data.flexibility ?? {};
  const p = data.performance ?? {};

  const romRows: { label: string; value: string }[] = [
    { label: 'Columna', value: `Flexión: ${val(r.columnaFlexion)}  ·  Extensión: ${val(r.columnaExtension)}` },
    {
      label: 'Hombros',
      value: `Rot. int I/D: ${val(r.hombroRotIntIzq)}/${val(r.hombroRotIntDer)}  ·  Rot. ext I/D: ${val(r.hombroRotExtIzq)}/${val(r.hombroRotExtDer)}  ·  Flex I/D: ${val(r.hombroFlexionIzq)}/${val(r.hombroFlexionDer)}`,
    },
    { label: 'Cadera', value: `Flexión  IZQ: ${val(r.caderaFlexionIzq)}   DER: ${val(r.caderaFlexionDer)}` },
    { label: 'Rodilla', value: `Flexión  IZQ: ${val(r.rodillaFlexionIzq)}   DER: ${val(r.rodillaFlexionDer)}` },
    { label: 'Sit and Reach Test', value: val(f.resultadoCm, ' cm') },
  ];

  return (
    <div className="mx-auto w-full max-w-[900px] rounded-2xl border-2 border-green-600 bg-white p-5 text-gray-900 md:p-7">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-lg bg-green-700 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="In Move" className="size-14 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/40" />
        <h1 className="flex-1 text-center text-lg font-extrabold uppercase tracking-wide text-white md:text-xl">
          Ficha de Valoración In Move
        </h1>
        <span className="size-14 shrink-0" aria-hidden />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_130px]">
        <div className="grid gap-2">
          <Field label="Nombre del deportista" value={data.name} />
          <Field label="Documento de identidad" value={data.document} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Fecha de nacimiento" value={fmtDate(data.birthDate)} />
            <Field label="Edad" value={data.age == null ? '—' : `${data.age} años`} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Fecha de valoración" value={fmtDate(data.assessedOn)} />
            <Field label="Código" value={data.code} />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="grid h-[150px] w-[120px] place-items-center overflow-hidden rounded-md border border-green-300 bg-green-50">
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-green-700">Sin foto</span>
            )}
          </div>
        </div>
      </div>

      <SectionTitle>Indicadores de rendimiento</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Peso (kg)" value={val(a.pesoKg)} />
        <Metric label="Estatura (cm)" value={val(a.estaturaCm)} />
        <Metric label="% Grasa" value={val(a.pctGrasa, ' %')} />
        <Metric label="% Masa corporal" value={val(a.pctMasa, ' %')} />
      </div>

      <SectionTitle>Valoración de movilidad y flexibilidad (ROM)</SectionTitle>
      <div className="overflow-hidden rounded-md border border-green-300">
        {romRows.map((row, i) => (
          <div key={row.label} className={`grid grid-cols-[140px_1fr] ${i > 0 ? 'border-t border-green-200' : ''}`}>
            <div className="bg-green-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-green-800">{row.label}</div>
            <div className="bg-white px-3 py-2 text-sm text-gray-900">{row.value}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Control cardiovascular</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="FC reposo (ppm)" value={val(c.fcReposo)} />
        <Metric label="FC inicial (ppm)" value={val(c.fcInicial)} />
        <Metric label="FC final (ppm)" value={val(c.fcFinal)} />
        <Metric label="FC máxima (ppm)" value={val(c.fcMax)} />
      </div>

      <SectionTitle>Rendimiento</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Squat Jump (cm)" value={val(p.sjCm)} />
        <Metric label="CMJ (cm)" value={val(p.cmjCm)} />
        <Metric label="Abalakov (cm)" value={val(p.abalakovCm)} />
        <Metric label="Salto unilat. I/D (cm)" value={`${val(p.saltoUnilateralIzqCm)} / ${val(p.saltoUnilateralDerCm)}`} />
        <Metric label="Fuerza máxima (kg)" value={val(p.fuerzaMaximaKg)} />
        <Metric label="Sentadilla 1RM (kg)" value={val(p.sentadilla1rmKg)} />
        <Metric label="Press banca 1RM (kg)" value={val(p.pressBanca1rmKg)} />
        <Metric label="% 1RM sentadilla" value={val(p.pct1rmSentadilla, ' %')} />
      </div>

      <SectionTitle>Velocidad y agilidad</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Velocidad 10 m (s)" value={val(p.velocidad10mS)} />
        <Metric label="30 metros (s)" value={val(p.velocidad30mS)} />
        <Metric label="Test 5-10-5 (s)" value={val(p.agilidad505S)} />
      </div>

      <SectionTitle>Observaciones generales</SectionTitle>
      <div className="min-h-[56px] rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-gray-900">
        {data.observations || '—'}
      </div>

      <SectionTitle>Plan de intervención</SectionTitle>
      <div className="min-h-[56px] rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-gray-900">
        {data.plan || '—'}
      </div>

      <p className="mt-5 text-center text-[11px] text-green-700">In Move · Centro de Evaluación y Rendimiento · Código {data.code}</p>
    </div>
  );
}

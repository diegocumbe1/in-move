import { notFound } from 'next/navigation';
import { getFichaData } from '@/lib/ficha-data';
import { getFichaTheme } from '@/lib/actions';
import { buildComparison, buildRadar } from '@/lib/comparison';
import { FichaView } from '@/components/ficha-view';

// Ruta PÚBLICA (sin sesión): el deportista ve su ficha, la comparación y el PDF.
export default async function FichaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { id } = await params;
  const { theme: themeParam } = await searchParams;
  const data = await getFichaData(id);
  if (!data) notFound();

  // ?theme=dark|light permite previsualizar; si no, usa la preferencia guardada.
  const theme = themeParam === 'dark' || themeParam === 'light' ? themeParam : await getFichaTheme();

  const measures = {
    anthropometry: data.anthropometry,
    cardio: data.cardio,
    flexibility: data.flexibility,
    performance: data.performance,
  };
  const comparisons = buildComparison(data.sex, measures);
  const radar = buildRadar(measures);

  return (
    <div className="ficha-scope min-h-dvh bg-[var(--fc-page)] px-4 py-6 print:p-0" data-theme={theme}>
      <FichaView data={data} comparisons={comparisons} radar={radar} rom={data.rom} />
    </div>
  );
}

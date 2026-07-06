import { notFound } from 'next/navigation';
import { getFichaData } from '@/lib/ficha-data';
import { buildComparison } from '@/lib/comparison';
import { FichaView } from '@/components/ficha-view';

// Ruta PÚBLICA (sin sesión): el deportista ve su ficha, la comparación y el PDF.
export default async function FichaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getFichaData(id);
  if (!data) notFound();

  const comparisons = buildComparison(data.sex, {
    anthropometry: data.anthropometry,
    cardio: data.cardio,
    flexibility: data.flexibility,
    performance: data.performance,
  });

  return (
    <div className="min-h-dvh bg-gray-100 px-4 py-6 print:bg-white print:p-0">
      <FichaView data={data} comparisons={comparisons} />
    </div>
  );
}

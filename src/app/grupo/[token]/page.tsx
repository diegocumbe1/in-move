import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFichaTheme } from '@/lib/actions';
import { getPublicGroupReport } from '@/lib/group-report-data';
import { GroupReportView } from '@/components/group-report-view';
import { FichaToolbar } from '@/components/ficha-toolbar';

// Ruta PÚBLICA (sin sesión): el responsable del grupo ve solo datos generales.
// El token es aleatorio y el admin puede revocarlo o regenerarlo en cualquier momento.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ficha grupal · In Move',
  robots: { index: false, follow: false },
};

export default async function GrupoPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { token } = await params;
  const { theme: themeParam } = await searchParams;
  const data = await getPublicGroupReport(token);
  if (!data) notFound();

  const theme = themeParam === 'dark' || themeParam === 'light' ? themeParam : await getFichaTheme();

  return (
    <div className="ficha-scope grid min-h-dvh gap-4 bg-[var(--fc-page)] px-4 py-6 print:p-0" data-theme={theme}>
      <FichaToolbar canBack={false} />
      <GroupReportView data={data} />
    </div>
  );
}

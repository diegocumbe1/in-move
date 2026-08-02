import type { Metadata, Viewport } from 'next';
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { RegisterSW } from '@/components/pwa/register-sw';
import './globals.css';

/* Tipografías (self-hosted por next/font — sin llamadas externas en runtime). */
const display = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  applicationName: 'In Move',
  title: {
    default: 'In Move — Valoración y Rendimiento',
    template: '%s · In Move',
  },
  description:
    'Plataforma de valoración física y rendimiento deportivo. Fichas digitales, clasificación por semáforo, historial y portal del deportista.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'In Move',
  },
  formatDetection: { telephone: false },
  // El favicon y el apple-icon salen de src/app/icon.png y src/app/apple-icon.png
  // (convención de archivos de Next), generados desde el logo de In Move.
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#05080A' },
    { media: '(prefers-color-scheme: light)', color: '#05080A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // evita zoom accidental durante la captura de datos en tablet
  viewportFit: 'cover', // habilita env(safe-area-inset-*) en iOS
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema de la plataforma (localStorage) antes del primer pintado
            para evitar el parpadeo oscuro→claro. La ficha pública usa su propio scope. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('inmove-theme')==='light')document.documentElement.dataset.theme='light';}catch(e){}",
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

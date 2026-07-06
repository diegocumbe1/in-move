import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "In Move — Ficha de Valoración",
  description: "Preview de la plataforma de valoración y rendimiento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

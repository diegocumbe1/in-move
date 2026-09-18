/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
    formats: ['image/webp'],
    // Supabase Storage responde `cache-control: no-cache` en las fotos ya subidas,
    // así que sin este mínimo Next volvería a descargar y reoptimizar los ~2 MB
    // del original en cada visita. 30 días: las rutas son UUID y nunca se reescriben.
    minimumCacheTTL: 2592000,
  },
  // Propuestas comerciales: se sirven como HTML estático desde /public/propuestas
  // con URL limpia (sin .html) para poder compartirlas con el cliente.
  async rewrites() {
    return [
      { source: '/propuestas/fase-2-grupos', destination: '/propuestas/fase-2-grupos.html' },
    ];
  },
};

export default nextConfig;

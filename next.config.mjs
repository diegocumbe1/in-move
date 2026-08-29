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
};

export default nextConfig;

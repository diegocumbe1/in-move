import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit corre fuera de Next.js, por eso cargamos .env.local manualmente.
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Usa la conexion directa (puerto 5432) para aplicar el esquema.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});

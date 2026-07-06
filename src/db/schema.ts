import { pgTable, uuid, text, date, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type {
  Anthropometry,
  Cardio,
  Rom,
  Flexibility,
  Performance,
} from '@/lib/ficha';

/**
 * Esquema Drizzle. Las medidas de la ficha viven en columnas JSONB tipadas por
 * dominio (anthropometry, cardio, rom, flexibility, performance): agregar campos
 * de medida NO requiere migracion, solo editar los tipos en src/lib/ficha.ts.
 */

// "Variables" editables por el admin: categorias, grupos, deportes, posiciones.
export const catalogItems = pgTable('catalog_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(), // 'category' | 'group' | 'sport' | 'position'
  label: text('label').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const athletes = pgTable('athletes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // codigo unico de 8 digitos
  name: text('name').notNull(),
  document: text('document').notNull(),
  birthDate: date('birth_date').notNull(),
  sex: text('sex').notNull(), // 'M' | 'F'
  category: text('category'),
  group: text('group'),
  sport: text('sport'),
  position: text('position'),
  photoPath: text('photo_path'), // ruta dentro del bucket athlete-photos
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  athleteId: uuid('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  assessedOn: date('assessed_on').notNull().defaultNow(),
  anthropometry: jsonb('anthropometry').$type<Anthropometry>().default({}),
  cardio: jsonb('cardio').$type<Cardio>().default({}),
  rom: jsonb('rom').$type<Rom>().default({}),
  flexibility: jsonb('flexibility').$type<Flexibility>().default({}),
  performance: jsonb('performance').$type<Performance>().default({}),
  observations: text('observations'),
  plan: text('plan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Athlete = typeof athletes.$inferSelect;
export type NewAthlete = typeof athletes.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type CatalogItem = typeof catalogItems.$inferSelect;

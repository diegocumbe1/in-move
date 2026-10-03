import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, date, integer, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import type { GroupFlags, GroupResponsible } from '@/lib/groups';
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
  // Inhabilitado: no aparece en listados, grupos ni rankings; se puede reactivar.
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  // Borrado logico (igual que assessments): se oculta de la app y de su ficha
  // publica, pero se conserva en BD con la justificacion.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedReason: text('deleted_reason'),
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
  // Borrado logico: la ficha se oculta de la app y de la ruta publica, pero se
  // conserva en BD junto con la justificacion (auditoria).
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedReason: text('deleted_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Configuración global de la app (clave/valor). Ej. tema de la ficha.
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Fase 2 · C1 — Grupos como entidad. Grupo ≠ categoría (ver PLAN_FASE2_C1.md §2.1).
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // Normalizado (sin tildes, minúsculas): impide "Running" y "running " como dos grupos.
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoPath: text('logo_path'),
  color: text('color'),
  // Flags (disciplina, sede, modalidad) con el id del ítem de catálogo, no el texto.
  flags: jsonb('flags').$type<GroupFlags>().notNull().default({}),
  capacity: integer('capacity'),
  // Responsable del grupo (dueño de la escuela, líder, entrenador): datos básicos.
  responsible: jsonb('responsible').$type<GroupResponsible>(),
  // Token del enlace público de la ficha grupal. null = enlace desactivado.
  // Es aleatorio e independiente del id: revocar o regenerar invalida el enlace anterior.
  shareToken: text('share_token').unique(),
  status: text('status').notNull().default('active'), // active | inactive | archived
  startsOn: date('starts_on'),
  endsOn: date('ends_on'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Membresías con histórico: left_at null = activa. Un deportista puede estar en
// varios grupos y reingresar a uno, pero no estar dos veces activo en el mismo.
export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    athleteId: uuid('athlete_id').notNull().references(() => athletes.id, { onDelete: 'cascade' }),
    joinedAt: date('joined_at').notNull().defaultNow(),
    leftAt: date('left_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('group_members_unique_active').on(t.groupId, t.athleteId).where(sql`left_at is null`),
    index('group_members_athlete_idx').on(t.athleteId),
  ],
);

export type Athlete = typeof athletes.$inferSelect;
export type NewAthlete = typeof athletes.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;

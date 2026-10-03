'use client';

import { useMemo, useState } from 'react';
import { Ban, Check, ChevronDown, ChevronRight, Copy, RotateCcw, Trash2, ExternalLink, Link2, ListFilter, Pencil, Plus, RefreshCw, Search, Trophy, UserMinus, UserPlus, UserRound, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/premium';
import { Avatar, SafetyModal, SectionHeader } from '@/components/admin-ui';
import { ScaleCellView } from '@/components/scale-cell';
import * as groupApi from '@/lib/group-actions';
import { athleteCells } from '@/lib/group-cells';
import { GROUP_COLUMNS, compareCells, groupTableEnabled, rankByScore, type GroupColumnKey, type GroupPublicSettings } from '@/lib/group-columns';
import type { CatalogOption } from '@/lib/actions';
import { formatDate, type Athlete } from '@/lib/mock-product';
import {
  GROUP_FLAG_CATALOG,
  GROUP_FLAG_LABELS,
  GROUP_STATUSES,
  GROUP_STATUS_LABELS,
  RANKING_INDICATORS,
  RESPONSIBLE_ROLE_SUGGESTIONS,
  effectiveCapacity,
  limitState,
  rankAthletes,
  type GroupFlagKey,
  type GroupFlags,
  type GroupInput,
  type GroupResponsible,
  type GroupStatus,
  type GroupSummary,
  type PlanLimits,
  type RankingIndicator,
} from '@/lib/groups';

/**
 * Módulo de Grupos (Fase 2 · C1): administración de grupos, listado de sus
 * deportistas, acceso al detalle y ranking simple por indicador.
 *
 * Grupo ≠ categoría: aquí solo se ven equipos. La categoría (tipo de servicio)
 * sigue en el deportista y no cambia nada de su ficha privada.
 */

const FLAG_KEYS = Object.keys(GROUP_FLAG_CATALOG) as GroupFlagKey[];
const DEFAULT_COLOR = '#7ED957';

type Props = {
  groups: GroupSummary[];
  athletes: Athlete[];
  catalogOptions: CatalogOption[];
  planLimits: PlanLimits;
  /** Qué indicadores ve la tabla general y en qué grupos (Settings). */
  tableSettings: GroupPublicSettings;
  groupsReady: boolean;
  /** Grupo a abrir al entrar (ej. al tocarlo en el panel o al volver del detalle). */
  initialGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenAthlete: (athlete: Athlete) => void;
  onReload: () => Promise<void>;
};

export function GroupsView({
  groups,
  athletes,
  catalogOptions,
  planLimits,
  tableSettings,
  groupsReady,
  initialGroupId,
  onSelectGroup,
  onOpenAthlete,
  onReload,
}: Props) {
  const initialGroup = groups.find((group) => group.id === initialGroupId);
  // Si se llega a un grupo inactivo o archivado, no esconderlo tras el filtro "Activo".
  const [statusFilter, setStatusFilter] = useState<GroupStatus | 'all'>(
    initialGroup && initialGroup.status !== 'active' ? 'all' : 'active',
  );
  const [flagFilter, setFlagFilter] = useState<Partial<Record<GroupFlagKey, string>>>({});
  const [selectedId, setSelectedIdState] = useState<string | null>(initialGroup?.id ?? null);
  const setSelectedId = (groupId: string) => {
    setSelectedIdState(groupId);
    onSelectGroup(groupId);
  };
  const [formGroup, setFormGroup] = useState<GroupSummary | 'new' | null>(null);

  const labelById = useMemo(() => new Map(catalogOptions.map((option) => [option.id, option.label])), [catalogOptions]);
  const optionsFor = (key: GroupFlagKey) => catalogOptions.filter((option) => option.kind === GROUP_FLAG_CATALOG[key]);

  const activeCount = groups.filter((group) => group.status === 'active').length;
  const activeLimit = planLimits.enabled ? limitState(activeCount, planLimits.maxActiveGroups) : 'ok';

  const visibleGroups = groups.filter(
    (group) =>
      (statusFilter === 'all' || group.status === statusFilter) &&
      FLAG_KEYS.every((key) => !flagFilter[key] || group.flags[key] === flagFilter[key]),
  );
  const selected = groups.find((group) => group.id === selectedId) ?? visibleGroups[0] ?? null;

  if (!groupsReady) {
    return (
      <section className="surface-1 rounded-lg p-6">
        <SectionHeader eyebrow="Fase 2" title="Grupos" />
        <p className="text-sm text-muted-foreground">
          El módulo de grupos se activa cuando se apliquen las tablas nuevas en la base de datos. Mientras tanto,
          los deportistas siguen mostrando su grupo como hasta ahora.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="surface-1 rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {planLimits.enabled ? `${activeCount} de ${planLimits.maxActiveGroups} grupos activos` : `${activeCount} grupo(s) activo(s)`}
              {activeLimit === 'warning' ? ' · cerca del límite del plan' : activeLimit === 'full' ? ' · límite del plan alcanzado' : ''}
            </p>
            <h2 className="text-xl font-semibold">Grupos</h2>
          </div>
          <Button onClick={() => setFormGroup('new')} disabled={activeLimit === 'full'}>
            <Plus />
            Nuevo grupo
          </Button>
        </div>
        {activeLimit !== 'ok' ? <LimitBar used={activeCount} max={planLimits.maxActiveGroups} /> : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Estado"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as GroupStatus | 'all')}
            options={[{ value: 'all', label: 'Todos los estados' }, ...GROUP_STATUSES.map((status) => ({ value: status, label: GROUP_STATUS_LABELS[status] }))]}
          />
          {FLAG_KEYS.map((key) => (
            <FilterSelect
              key={key}
              label={GROUP_FLAG_LABELS[key]}
              value={flagFilter[key] ?? ''}
              onChange={(value) => setFlagFilter((current) => ({ ...current, [key]: value || undefined }))}
              options={[{ value: '', label: `${GROUP_FLAG_LABELS[key]}: todas` }, ...optionsFor(key).map((option) => ({ value: option.id, label: option.label }))]}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              planLimits={planLimits}
              flagLabels={FLAG_KEYS.map((key) => labelById.get(group.flags[key] ?? '')).filter((label): label is string => Boolean(label))}
              active={selected?.id === group.id}
              onClick={() => setSelectedId(group.id)}
            />
          ))}
          {visibleGroups.length === 0 ? (
            <p className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {groups.length === 0 ? 'Aún no hay grupos. Crea el primero con "Nuevo grupo".' : 'Ningún grupo coincide con los filtros.'}
            </p>
          ) : null}
        </div>
      </section>

      {selected ? (
        <GroupDetail
          key={selected.id}
          group={selected}
          athletes={athletes}
          planLimits={planLimits}
          tableSettings={tableSettings}
          flagLabels={FLAG_KEYS.map((key) => [GROUP_FLAG_LABELS[key], labelById.get(selected.flags[key] ?? '')] as const)}
          onEdit={() => setFormGroup(selected)}
          onOpenAthlete={onOpenAthlete}
          onReload={onReload}
        />
      ) : null}

      {formGroup ? (
        <GroupFormModal
          group={formGroup === 'new' ? null : formGroup}
          optionsFor={optionsFor}
          onClose={() => setFormGroup(null)}
          onSaved={async () => {
            setFormGroup(null);
            await onReload();
          }}
        />
      ) : null}
    </div>
  );
}

// ── Tarjeta de grupo ───────────────────────────────────────────────────────

function GroupCard({
  group,
  planLimits,
  flagLabels,
  active,
  onClick,
}: {
  group: GroupSummary;
  planLimits: PlanLimits;
  flagLabels: string[];
  active: boolean;
  onClick: () => void;
}) {
  const max = effectiveCapacity(group.capacity, planLimits);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-md border bg-background/35 text-left transition ${active ? 'border-brand' : 'border-border hover:border-brand/40'}`}
    >
      <div className="h-1.5" style={{ background: group.color ?? DEFAULT_COLOR }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold">{group.name}</p>
          {group.status !== 'active' ? (
            <span className="shrink-0 rounded-pill border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {GROUP_STATUS_LABELS[group.status]}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{flagLabels.join(' · ') || 'Sin disciplina ni sede'}</p>
        <p className="tabular mt-3 text-sm">
          <span className="font-semibold">{group.memberIds.length}</span>
          <span className="text-muted-foreground">
            {max == null ? ' deportistas' : ` / ${max} deportistas${group.capacity ? '' : ' (límite del plan)'}`}
          </span>
        </p>
      </div>
    </button>
  );
}

// ── Detalle del grupo ──────────────────────────────────────────────────────

function GroupDetail({
  group,
  athletes,
  planLimits,
  tableSettings,
  flagLabels,
  onEdit,
  onOpenAthlete,
  onReload,
}: {
  group: GroupSummary;
  athletes: Athlete[];
  planLimits: PlanLimits;
  tableSettings: GroupPublicSettings;
  flagLabels: ReadonlyArray<readonly [string, string | undefined]>;
  onEdit: () => void;
  onOpenAthlete: (athlete: Athlete) => void;
  onReload: () => Promise<void>;
}) {
  const [tab, setTab] = useState<'members' | 'ranking'>('members');
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [danger, setDanger] = useState<'disable' | 'delete' | null>(null);

  const members = useMemo(() => athletes.filter((athlete) => group.memberIds.includes(athlete.id)), [athletes, group.memberIds]);
  const max = effectiveCapacity(group.capacity, planLimits);
  const capacity = max == null ? 'ok' : limitState(members.length, max);
  const [sortKey, setSortKey] = useState<'rank' | GroupColumnKey>('rank');
  const normalized = query.trim().toLowerCase();

  // Posición global (score) y celdas por deportista con ficha.
  const tableRows = useMemo(() => {
    const { ranked } = rankByScore(members);
    return new Map(
      ranked.map(({ athlete, assessment, position }) => [athlete.id, { position, cells: athleteCells(athlete, assessment) }]),
    );
  }, [members]);

  const tableEnabled = groupTableEnabled(tableSettings, group.id);
  const columns = tableEnabled ? GROUP_COLUMNS.filter((column) => tableSettings.adminColumns.includes(column.key)) : [];
  const sortColumn = columns.find((column) => column.key === sortKey);
  const visibleMembers = members
    .filter(
      (athlete) => !normalized || [athlete.name, athlete.code, athlete.document].join(' ').toLowerCase().includes(normalized),
    )
    .sort((a, b) => {
      const rowA = tableRows.get(a.id);
      const rowB = tableRows.get(b.id);
      if (!rowA || !rowB) return rowA ? -1 : rowB ? 1 : a.name.localeCompare(b.name, 'es');
      const byColumn = sortColumn ? compareCells(rowA.cells[sortColumn.key], rowB.cells[sortColumn.key], sortColumn.better) : 0;
      return byColumn || rowA.position - rowB.position;
    });

  async function remove(athlete: Athlete) {
    if (!window.confirm(`¿Retirar a ${athlete.name} de ${group.name}? Su historial y sus fichas se conservan.`)) return;
    setBusy(true);
    try {
      const problem = await groupApi.removeGroupMember(group.id, athlete.id);
      if (problem) alert(problem);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-1 overflow-hidden rounded-lg">
      <div className="h-2" style={{ background: group.color ?? DEFAULT_COLOR }} />
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Grupo · {GROUP_STATUS_LABELS[group.status]}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{group.name}</h2>
            {group.description ? <p className="mt-1 text-sm text-muted-foreground">{group.description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {flagLabels.map(([label, value]) => (
                <span key={label} className="rounded-pill border border-border px-3 py-1 text-muted-foreground">
                  {label}: <span className="font-semibold text-foreground">{value ?? '—'}</span>
                </span>
              ))}
              {group.startsOn || group.endsOn ? (
                <span className="rounded-pill border border-border px-3 py-1 text-muted-foreground">
                  Ciclo: {group.startsOn ? formatDate(group.startsOn) : '—'} → {group.endsOn ? formatDate(group.endsOn) : '—'}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil />
              Editar grupo
            </Button>
            {group.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={() => setDanger('disable')}>
                <Ban />
                Inhabilitar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const problem = await groupApi.setGroupStatus(group.id, 'active');
                    if (problem) alert(problem);
                    await onReload();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <RotateCcw />
                Reactivar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDanger('delete')} className="text-level-danger hover:border-level-danger/60">
              <Trash2 />
              Eliminar
            </Button>
            <Button size="sm" onClick={() => setPickerOpen(true)} disabled={group.status !== 'active' || capacity === 'full'}>
              <UserPlus />
              Agregar deportistas
            </Button>
          </div>
        </div>

        <p className="tabular mt-4 text-sm text-muted-foreground">
          {max == null
            ? `${members.length} deportistas · sin cupo`
            : `${members.length} de ${max} deportistas${group.capacity ? ' · cupo del grupo' : ' · sin cupo propio, aplica el límite del plan'}`}
          {capacity === 'warning' ? ' · cerca del cupo' : capacity === 'full' ? ' · cupo completo' : ''}
        </p>
        {max == null ? null : <LimitBar used={members.length} max={max} />}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <ResponsibleCard responsible={group.responsible} onEdit={onEdit} />
          <SharePanel group={group} onReload={onReload} />
        </div>

        <div className="mt-5 flex gap-2">
          <TabButton active={tab === 'members'} onClick={() => setTab('members')} icon={<UsersRound className="size-4" />}>
            Deportistas
          </TabButton>
          <TabButton active={tab === 'ranking'} onClick={() => setTab('ranking')} icon={<Trophy className="size-4" />}>
            Ranking
          </TabButton>
        </div>

        {tab === 'members' ? (
          <div className="mt-4">
            <label className="flex h-12 items-center gap-3 rounded-sm border border-border bg-background px-3">
              <Search className="size-5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en el grupo por nombre, código o documento"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <p className="mt-3 text-xs text-muted-foreground">
              {tableEnabled
                ? 'Última ficha de cada deportista. Desliza a la derecha para ver todos los indicadores; toca un encabezado para ordenar.'
                : 'La tabla general de indicadores está desactivada para este grupo (Configuración → Tabla general de grupos).'}
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-max min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-surface px-3 py-3">
                      <SortHeader active={sortKey === 'rank'} onClick={() => setSortKey('rank')}>Deportista</SortHeader>
                    </th>
                    <th className="px-3 py-3">Estado</th>
                    {columns.map((column) => (
                      <th key={column.key} className="whitespace-nowrap px-3 py-3">
                        <SortHeader active={sortKey === column.key} onClick={() => setSortKey(column.key)}>{column.label}</SortHeader>
                      </th>
                    ))}
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((athlete) => {
                    const row = tableRows.get(athlete.id);
                    return (
                      <tr key={athlete.id} onClick={() => onOpenAthlete(athlete)} className="group cursor-pointer border-b border-border/60 transition hover:bg-white/5">
                        <td className="sticky left-0 z-10 bg-surface px-3 py-3 group-hover:shadow-[inset_0_0_0_999px_rgb(255_255_255/0.05)]">
                          <div className="flex w-[240px] items-center gap-3">
                            <span
                              className={`tabular grid size-7 shrink-0 place-items-center rounded-sm text-xs font-bold ${
                                row?.position === 1 ? 'bg-brand/15 text-brand' : 'bg-white/5 text-muted-foreground'
                              }`}
                              title="Posición en el ranking global del grupo (score)"
                            >
                              {row?.position ?? '—'}
                            </span>
                            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{athlete.name}</p>
                              <p className="font-mono text-xs tracking-[0.14em] text-brand">{athlete.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3"><StatusBadge level={athlete.status} label={athlete.statusLabel} size="sm" /></td>
                        {columns.map((column) => (
                          <td key={column.key} className="px-3 py-3 align-middle">
                            {row ? <ScaleCellView cell={row.cells[column.key]} /> : <span className="text-xs text-muted-foreground">Sin ficha</span>}
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              title="Retirar del grupo"
                              disabled={busy}
                              onClick={(event) => {
                                event.stopPropagation();
                                void remove(athlete);
                              }}
                              className="grid size-9 place-items-center rounded-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            >
                              <UserMinus className="size-4" />
                            </button>
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                              Ver <ChevronRight className="size-4" />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleMembers.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 3} className="px-3 py-10 text-center text-muted-foreground">
                        {members.length === 0 ? 'Este grupo aún no tiene deportistas.' : 'Nadie del grupo coincide con la búsqueda.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <GroupRanking members={members} onOpenAthlete={onOpenAthlete} />
        )}
      </div>

      {danger === 'disable' ? (
        <SafetyModal
          tone="warning"
          eyebrow="Inhabilitar grupo"
          title={group.name}
          description="El grupo queda inactivo. Puedes reactivarlo cuando quieras desde este mismo detalle."
          consequences={[
            'No se pueden agregar deportistas mientras esté inactivo.',
            'Deja de contar en el límite de grupos activos del plan.',
            'Los deportistas, sus fichas y las membresías se conservan.',
            group.shareToken ? 'El enlace público sigue abierto; desactívalo aparte si no debe verse.' : 'No tiene enlace público activo.',
          ]}
          confirmLabel="Inhabilitar grupo"
          onClose={() => setDanger(null)}
          onConfirm={async () => {
            const problem = await groupApi.setGroupStatus(group.id, 'inactive');
            if (problem) return problem;
            setDanger(null);
            await onReload();
          }}
        />
      ) : null}

      {danger === 'delete' ? (
        <SafetyModal
          tone="danger"
          eyebrow="Eliminar grupo · no se puede deshacer"
          title={group.name}
          description="Se borra el grupo y todo su historial de membresías. Si solo quieres pausarlo, usa Inhabilitar."
          consequences={[
            `Sus ${members.length} deportista(s) salen del grupo, pero NO se borran ni pierden sus fichas.`,
            'Se pierde el historial de entradas y salidas del grupo.',
            'El enlace público del grupo deja de abrir.',
          ]}
          confirmWord={group.name}
          confirmLabel="Eliminar definitivamente"
          onClose={() => setDanger(null)}
          onConfirm={async () => {
            const problem = await groupApi.deleteGroup(group.id);
            if (problem) return problem;
            setDanger(null);
            await onReload();
          }}
        />
      ) : null}

      {pickerOpen ? (
        <MemberPicker
          group={group}
          athletes={athletes}
          remaining={max == null ? null : Math.max(max - members.length, 0)}
          onClose={() => setPickerOpen(false)}
          onSaved={async () => {
            setPickerOpen(false);
            await onReload();
          }}
        />
      ) : null}
    </section>
  );
}

// ── Responsable y enlace público ───────────────────────────────────────────

function ResponsibleCard({ responsible, onEdit }: { responsible: GroupResponsible | null; onEdit: () => void }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <UserRound className="size-4" /> Responsable
      </p>
      {responsible ? (
        <div className="mt-2 text-sm">
          <p className="text-base font-semibold">{responsible.name}</p>
          <p className="text-muted-foreground">{responsible.role || 'Sin cargo'}</p>
          {responsible.phone ? <p className="mt-1">{responsible.phone}</p> : null}
          {responsible.email ? <p>{responsible.email}</p> : null}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">
          Sin responsable.{' '}
          <button type="button" onClick={onEdit} className="font-semibold text-brand hover:underline">
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Enlace público de la ficha grupal: solo datos generales, sin fichas
 * individuales. El admin decide a quién se lo comparte y puede revocarlo.
 */
function SharePanel({ group, onReload }: { group: GroupSummary; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = group.shareToken && typeof window !== 'undefined' ? `${window.location.origin}/grupo/${group.shareToken}` : '';

  async function run(op: () => Promise<string | null>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const problem = await op();
      if (problem) alert(problem);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia el enlace:', url);
    }
  }

  return (
    <div className="rounded-md border border-border bg-background/35 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Link2 className="size-4" /> Enlace público del grupo
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Muestra el ranking, la composición, los promedios, el semáforo grupal, la evolución y el conteo de alertas, con los indicadores elegidos en Configuración → Tabla general de grupos (ahí también se decide si salen nombres o fotos). Nunca incluye fichas individuales.
      </p>
      {group.shareToken ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={copy} disabled={busy}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank', 'noopener')} disabled={busy}>
              <ExternalLink />
              Abrir
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => groupApi.enableGroupShare(group.id, true), 'Se genera un enlace nuevo y el anterior deja de funcionar. ¿Continuar?')}
            >
              <RefreshCw />
              Regenerar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => groupApi.disableGroupShare(group.id), 'Quien tenga el enlace ya no podrá abrirlo. ¿Desactivarlo?')}
            >
              <X />
              Desactivar
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" className="mt-3" disabled={busy || group.status === 'archived'} onClick={() => run(() => groupApi.enableGroupShare(group.id))}>
          <Link2 />
          Activar enlace público
        </Button>
      )}
    </div>
  );
}

// ── Ranking ────────────────────────────────────────────────────────────────

function GroupRanking({ members, onOpenAthlete }: { members: Athlete[]; onOpenAthlete: (athlete: Athlete) => void }) {
  const [indicator, setIndicator] = useState<RankingIndicator>('score');
  const { rows, withoutData } = rankAthletes(members, indicator);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {RANKING_INDICATORS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setIndicator(item.key)}
            className={`h-10 rounded-pill border px-4 text-sm font-semibold transition ${
              indicator === item.key ? 'border-brand bg-brand text-brand-foreground' : 'border-border text-muted-foreground hover:border-brand/40'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Según la última ficha de cada deportista, en puntaje 0–100 (más alto es mejor).
      </p>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <button
            key={row.athlete.id}
            type="button"
            onClick={() => onOpenAthlete(row.athlete)}
            className="flex w-full items-center gap-3 rounded-md border border-border bg-background/35 p-3 text-left transition hover:border-brand/40"
          >
            <span
              className={`tabular grid size-9 shrink-0 place-items-center rounded-sm text-sm font-bold ${
                row.position === 1 ? 'bg-brand/15 text-brand' : 'bg-white/5 text-muted-foreground'
              }`}
            >
              {row.position}
            </span>
            <Avatar name={row.athlete.name} photoUrl={row.athlete.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{row.athlete.name}</p>
              <p className="text-xs text-muted-foreground">{row.display} · {formatDate(row.assessedOn)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white/5">
                <div className="h-full rounded-pill bg-brand" style={{ width: `${row.score}%` }} />
              </div>
            </div>
            <span className="tabular shrink-0 text-lg font-bold text-brand">{row.score}</span>
          </button>
        ))}
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nadie del grupo tiene datos en este indicador todavía.
          </p>
        ) : null}
      </div>

      {withoutData.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Sin dato en este indicador ({withoutData.length}): {withoutData.map((athlete) => athlete.name).join(', ')}.
        </p>
      ) : null}
    </div>
  );
}

// ── Agregar deportistas ────────────────────────────────────────────────────

function MemberPicker({
  group,
  athletes,
  remaining,
  onClose,
  onSaved,
}: {
  group: GroupSummary;
  athletes: Athlete[];
  /** null = sin cupo. */
  remaining: number | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const overCapacity = remaining != null && picked.length > remaining;

  const normalized = query.trim().toLowerCase();
  const candidates = athletes.filter(
    (athlete) =>
      !group.memberIds.includes(athlete.id) &&
      (!normalized || [athlete.name, athlete.code, athlete.document, athlete.category, athlete.group].join(' ').toLowerCase().includes(normalized)),
  );

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    try {
      const problem = await groupApi.addGroupMembers(group.id, picked);
      if (problem) {
        alert(problem);
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Agregar a ${group.name}`} subtitle={`${remaining == null ? 'Sin cupo máximo.' : `Quedan ${remaining} cupo(s).`} Un deportista puede estar en varios grupos.`} onClose={onClose}>
      <label className="flex h-12 items-center gap-3 rounded-sm border border-border bg-background px-3">
        <Search className="size-5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar deportista"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div className="mt-3 max-h-[50dvh] space-y-2 overflow-y-auto">
        {candidates.map((athlete) => {
          const checked = picked.includes(athlete.id);
          return (
            <label
              key={athlete.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 transition ${checked ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/40'}`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(athlete.id)} className="size-4 accent-[hsl(var(--brand))]" />
              <Avatar name={athlete.name} photoUrl={athlete.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{athlete.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[athlete.category, athlete.group].filter(Boolean).join(' · ') || 'Sin categoría ni grupo'}
                </p>
              </div>
            </label>
          );
        })}
        {candidates.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No hay deportistas para agregar.</p> : null}
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${overCapacity ? 'text-level-danger' : 'text-muted-foreground'}`}>
          {picked.length} seleccionado(s){overCapacity ? ` · supera el cupo disponible (${remaining})` : ''}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={save} disabled={picked.length === 0 || overCapacity || saving}>
            <UserPlus />
            {saving ? 'Guardando…' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Crear / editar grupo ───────────────────────────────────────────────────

function GroupFormModal({
  group,
  optionsFor,
  onClose,
  onSaved,
}: {
  group: GroupSummary | null;
  optionsFor: (key: GroupFlagKey) => CatalogOption[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: group?.name ?? '',
    description: group?.description ?? '',
    color: group?.color ?? DEFAULT_COLOR,
    flags: { ...(group?.flags ?? {}) } as GroupFlags,
    capacity: group?.capacity?.toString() ?? '',
    status: group?.status ?? ('active' as GroupStatus),
    startsOn: group?.startsOn ?? '',
    endsOn: group?.endsOn ?? '',
    responsible: { name: '', role: '', phone: '', email: '', ...(group?.responsible ?? {}) } as GroupResponsible,
  });
  const [saving, setSaving] = useState(false);
  const setResponsible = (patch: Partial<GroupResponsible>) => setForm({ ...form, responsible: { ...form.responsible, ...patch } });

  async function save() {
    if (saving) return;
    setSaving(true);
    const input: GroupInput = {
      name: form.name,
      description: form.description,
      color: form.color,
      flags: Object.fromEntries(Object.entries(form.flags).filter(([, value]) => value)) as GroupFlags,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      status: form.status,
      startsOn: form.startsOn || null,
      endsOn: form.endsOn || null,
      responsible: form.responsible,
    };
    try {
      const problem = group ? await groupApi.updateGroup(group.id, input) : await groupApi.createGroup(input);
      if (problem) {
        alert(problem);
        return;
      }
      await onSaved();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el grupo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={group ? 'Editar grupo' : 'Nuevo grupo'}
      subtitle="Un grupo es un equipo u organización. No es lo mismo que la categoría (tipo de servicio) del deportista."
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre del grupo">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field-control" placeholder="Ej. Coofisam" />
        </Field>
        <Field label="Color">
          <div className="flex items-center gap-3">
            <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="h-12 w-16 cursor-pointer rounded-sm border border-border bg-transparent" />
            <span className="font-mono text-sm text-muted-foreground">{form.color}</span>
          </div>
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción">
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field-control" placeholder="Opcional" />
          </Field>
        </div>
        {FLAG_KEYS.map((key) => (
          <Field key={key} label={key === 'disciplina' ? 'Disciplina (lista de Deportes)' : GROUP_FLAG_LABELS[key]}>
            <select
              value={form.flags[key] ?? ''}
              onChange={(event) => setForm({ ...form, flags: { ...form.flags, [key]: event.target.value || undefined } })}
              className="field-control"
            >
              <option value="" className="bg-surface">Sin asignar</option>
              {optionsFor(key).map((option) => (
                <option key={option.id} value={option.id} className="bg-surface">{option.label}</option>
              ))}
            </select>
          </Field>
        ))}
        <Field label="Cupo máximo">
          <input type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className="field-control" placeholder="Vacío = límite del plan" />
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as GroupStatus })} className="field-control">
            {GROUP_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-surface">{GROUP_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </Field>
        <Field label="Inicio del ciclo">
          <input type="date" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} className="field-control" />
        </Field>
        <Field label="Cierre del ciclo">
          <input type="date" value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} className="field-control" />
        </Field>

        <div className="md:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold">Responsable del grupo</p>
          <p className="text-xs text-muted-foreground">
            Quien recibe el enlace público de la ficha grupal (dueño de la escuela, líder, entrenador). En el enlace solo se muestran nombre y cargo; teléfono y correo quedan para el centro.
          </p>
        </div>
        <Field label="Nombre">
          <input value={form.responsible.name} onChange={(event) => setResponsible({ name: event.target.value })} className="field-control" placeholder="Ej. Carlos Pérez" />
        </Field>
        <Field label="Cargo">
          <input
            list="responsible-roles"
            value={form.responsible.role}
            onChange={(event) => setResponsible({ role: event.target.value })}
            className="field-control"
            placeholder="Ej. Dueño de la escuela"
          />
          <datalist id="responsible-roles">
            {RESPONSIBLE_ROLE_SUGGESTIONS.map((role) => <option key={role} value={role} />)}
          </datalist>
        </Field>
        <Field label="Teléfono / WhatsApp">
          <input type="tel" value={form.responsible.phone} onChange={(event) => setResponsible({ phone: event.target.value })} className="field-control" placeholder="Opcional" />
        </Field>
        <Field label="Correo">
          <input type="email" value={form.responsible.email} onChange={(event) => setResponsible({ email: event.target.value })} className="field-control" placeholder="Opcional" />
        </Field>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="button" onClick={save} disabled={form.name.trim().length < 2 || saving}>
          <Plus />
          {saving ? 'Guardando…' : group ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
      </div>
    </Modal>
  );
}

// ── Piezas pequeñas ────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
      <section className="surface-2 max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-lg p-4 shadow-float md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Button type="button" variant="outline" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-sm border border-border bg-background px-3">
      <ListFilter className="size-5 shrink-0 text-muted-foreground" />
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-foreground">{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function SortHeader({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-foreground ${active ? 'text-brand' : ''}`}
    >
      {children}
      {active ? <ChevronDown className="size-3.5" /> : null}
    </button>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
        active ? 'border-brand bg-brand text-brand-foreground' : 'border-border text-muted-foreground hover:border-brand/40'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function LimitBar({ used, max }: { used: number; max: number }) {
  const state = limitState(used, max);
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 100;
  const color = state === 'full' ? 'bg-level-danger' : state === 'warning' ? 'bg-level-warning' : 'bg-brand';
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white/5">
      <div className={`h-full rounded-pill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

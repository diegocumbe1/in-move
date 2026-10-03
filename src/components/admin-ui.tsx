'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Piezas visuales compartidas del panel admin (deportistas, grupos, panel). */

export const defaultAthletePhoto = '/images/default-athlete.svg';

const isUnoptimizable = (src: string) =>
  src.startsWith('blob:') || src.startsWith('data:') || src.endsWith('.svg');

/**
 * Foto de deportista servida por el optimizador de Next: la original de Supabase
 * pesa ~2 MB y aquí baja a unos pocos KB en WebP al tamaño real de pantalla.
 * Las previsualizaciones locales (blob:/data:) no se pueden optimizar y caen a <img>.
 */
export function AthletePhoto({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  priority?: boolean;
}) {
  if (isUnoptimizable(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
  }
  // Sin `sizes` a propósito: con él Next asume una imagen fluida y arma el srcset
  // con `deviceSizes` (640 px como mínimo, ~70 KB). Omitiéndolo usa `imageSizes` y
  // genera solo 1x/2x del tamaño real — 48 y 96 px para un avatar.
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={70}
      priority={priority}
      className={className}
    />
  );
}

export function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string; size?: 'md' | 'lg' }) {
  const px = size === 'lg' ? 64 : 48;
  return (
    <AthletePhoto
      src={photoUrl ?? defaultAthletePhoto}
      alt={name}
      width={px}
      height={px}
      className={`${size === 'lg' ? 'size-16' : 'size-12'} shrink-0 rounded-md object-cover ring-1 ring-brand/20`}
    />
  );
}

export function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
    </div>
  );
}

/**
 * Modal de seguridad para acciones delicadas (inhabilitar, eliminar). Muestra
 * qué va a pasar y, según el caso, exige una justificación y/o escribir un
 * texto exacto (el nombre) antes de habilitar el botón.
 * `onConfirm` devuelve un mensaje de error para mostrar, o nada si salió bien.
 */
export function SafetyModal({
  tone,
  eyebrow,
  title,
  description,
  consequences,
  confirmWord,
  reasonPresets,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  tone: 'danger' | 'warning';
  eyebrow: string;
  title: string;
  description: string;
  consequences: string[];
  /** Si se indica, hay que escribirlo tal cual (sin distinguir mayúsculas) para confirmar. */
  confirmWord?: string;
  /** Si se indica, la justificación es obligatoria (mínimo 5 caracteres). */
  reasonPresets?: string[];
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<string | null | void>;
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const wordOk = !confirmWord || typed.trim().toLowerCase() === confirmWord.trim().toLowerCase();
  const reasonOk = !reasonPresets || reason.trim().length >= 5;
  const canConfirm = wordOk && reasonOk && !submitting;
  const accent = tone === 'danger' ? 'text-level-danger' : 'text-level-warning';

  async function submit() {
    if (!canConfirm) return;
    setSubmitting(true);
    setError('');
    try {
      const problem = await onConfirm(reason.trim());
      if (problem) {
        setError(problem);
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error && err.message ? err.message : 'No se pudo completar la acción. Intenta de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6" onClick={submitting ? undefined : onClose}>
      <section
        className="surface-2 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg p-5 shadow-float md:p-6"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${accent}`}>{eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className={`mt-5 flex gap-3 rounded-md border p-4 ${tone === 'danger' ? 'border-level-danger/40 bg-level-danger/10' : 'border-level-warning/40 bg-level-warning/10'}`}>
          <AlertTriangle className={`size-5 shrink-0 ${accent}`} />
          <ul className="space-y-1 text-sm">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {reasonPresets ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {reasonPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`rounded-[999px] border px-3 py-2 text-xs font-semibold transition ${
                    reason === preset ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted-foreground hover:border-brand/40 hover:text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-semibold text-muted-foreground">Justificación (obligatoria, mínimo 5 caracteres)</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="field-control h-auto py-3" />
            </label>
          </div>
        ) : null}

        {confirmWord ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm text-muted-foreground">
              Para confirmar, escribe <strong className="text-foreground">{confirmWord}</strong>
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoFocus={!reasonPresets}
              className="field-control"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
            />
          </label>
        ) : null}

        {error ? <p className="mt-3 text-sm font-semibold text-level-danger">{error}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant={tone === 'danger' ? 'destructive' : 'brand'} onClick={submit} disabled={!canConfirm}>
            {submitting ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

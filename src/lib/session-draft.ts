'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Borrador para sobrevivir a una sesión expirada: `useDraftState` es un `useState`
 * cuyo valor se guarda al expirar la sesión y se recupera al volver del login.
 *
 * Va en sessionStorage (no localStorage) porque son datos de deportistas: mueren
 * con la pestaña y no quedan en un dispositivo compartido. Solo se escribe al
 * expirar y se borra al recuperarlo: fuera de ese momento no hay nada guardado.
 */

const STORAGE_PREFIX = 'inmove-draft:';

/** Lectores del valor actual de cada estado montado. */
const collectors = new Map<string, () => unknown>();

function readDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/**
 * @param toStored Qué guardar, para valores que JSON no conserva (por ejemplo, un `File`).
 */
export function useDraftState<T>(key: string, initial: () => T, toStored: (value: T) => unknown = (value) => value) {
  const [state, setState] = useState<T>(() => readDraft<T>(key) ?? initial());
  const collect = useRef(() => toStored(state));
  collect.current = () => toStored(state);

  useEffect(() => {
    try {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      /* almacenamiento no disponible: no hay borrador que limpiar */
    }
    collectors.set(key, () => collect.current());
    return () => {
      collectors.delete(key);
    };
  }, [key]);

  return [state, setState] as const;
}

/** Guarda el valor actual de todos los estados montados. */
export function saveDrafts(): void {
  try {
    for (const [key, collect] of collectors) {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(collect()));
    }
  } catch {
    /* sin espacio o almacenamiento bloqueado: se pierde el borrador, no el acceso al login */
  }
}

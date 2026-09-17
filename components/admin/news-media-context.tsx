"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

import type { UploadedMedia } from "./news-editor-toolbar";

type InsertFn = (item: UploadedMedia) => void;

const NewsMediaInsertContext = createContext<{
  register: (fn: InsertFn) => void;
  insert: InsertFn;
} | null>(null);

/**
 * Une el panel de adjuntar con el editor: la foto se sube a la izquierda y
 * queda donde está el cursor, sin que el formulario de texto trague el archivo.
 */
export function NewsMediaInsertProvider({ children }: { children: ReactNode }) {
  const insertRef = useRef<InsertFn | null>(null);
  const api = useMemo(
    () => ({
      register(fn: InsertFn) {
        insertRef.current = fn;
      },
      insert(item: UploadedMedia) {
        insertRef.current?.(item);
      },
    }),
    [],
  );

  return (
    <NewsMediaInsertContext.Provider value={api}>
      {children}
    </NewsMediaInsertContext.Provider>
  );
}

export function useNewsMediaInsert() {
  return useContext(NewsMediaInsertContext);
}

"use client";

import { useEffect, useMemo } from "react";

import { BusyCue } from "./busy";

/**
 * El archivo que se acaba de elegir, antes de que el servidor conteste.
 *
 * Sin esto, elegir una foto y mandarla se ve igual que no haber tocado nada:
 * el input nativo dice el nombre y el resto de la pantalla sigue en idle. La
 * previa local —y la regla de carga encima, si la acción ya corre— es el
 * estado de espera que FR-035 pide cuando el dato todavía no volvió.
 */
export function ChosenFile({
  file,
  pending = false,
  pendingLabel,
}: {
  file: File;
  pending?: boolean;
  pendingLabel?: string;
}) {
  const preview = useMemo(() => {
    if (!file.type.startsWith("image/")) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (preview === null) {
      return;
    }

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="space-y-2xs">
      {preview === null ? (
        <p className="font-ui text-small text-ink-muted">{file.name}</p>
      ) : (
        // El blob es local: el optimizador de Next no lo sirve.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={file.name}
          data-busy-preview={pending ? "" : undefined}
          className="h-auto max-h-32 w-auto max-w-full"
        />
      )}
      {pending && pendingLabel !== undefined ? <BusyCue label={pendingLabel} /> : null}
    </div>
  );
}

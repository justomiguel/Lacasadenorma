"use client";

import { CopyField } from "@/components/design-system/copy-field";
import type { HelpContent } from "@/content/schema";

/**
 * Los datos para transferir, país por país.
 *
 * Una lista de filas con regla fina, sin caja: la etiqueta chica arriba, el dato
 * grande y tabular, y el icono de copiar a la derecha. Titular y documento no se
 * copian —se leen para verificar— y por eso no llevan acción.
 *
 * Las etiquetas están en castellano en los dos idiomas a propósito: son los
 * nombres que usa el banco, y quien transfiere desde afuera los necesita tal
 * como aparecen en la aplicación del banco.
 */
export function BankTransferDetails({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        data-kicker=""
        className="font-ui text-eyebrow font-medium uppercase text-ink-muted"
      >
        {heading}
      </p>
      <div className="mt-sm">{children}</div>
    </div>
  );
}

export function ArgentinaTransfer({
  account,
  heading,
  onCopied,
}: {
  account: HelpContent["accounts"]["AR"];
  heading: string;
  onCopied: (campo: string) => void;
}) {
  return (
    <BankTransferDetails heading={heading}>
      <CopyField
        label="Alias"
        value={account.alias}
        onCopied={() => {
          onCopied("alias");
        }}
      />
      <CopyField
        label="CBU"
        value={account.cbu}
        onCopied={() => {
          onCopied("cbu");
        }}
      />
      <CopyField
        label="Número de cuenta"
        value={account.accountNumber}
        onCopied={() => {
          onCopied("cuenta_argentina");
        }}
      />
      <CopyField label="Titular" value={account.holder} copyable={false} />
      <CopyField label="CUIT/CUIL" value={account.taxId} copyable={false} />
    </BankTransferDetails>
  );
}

export function ChileTransfer({
  account,
  heading,
  onCopied,
}: {
  account: HelpContent["accounts"]["CL"];
  heading: string;
  onCopied: (campo: string) => void;
}) {
  return (
    <BankTransferDetails heading={heading}>
      <CopyField
        label="RUT"
        value={account.rut}
        onCopied={() => {
          onCopied("rut");
        }}
      />
      <CopyField
        label="Número Cuenta"
        value={account.accountNumber}
        onCopied={() => {
          onCopied("cuenta_chile");
        }}
      />
      <CopyField
        label="Correo"
        value={account.email}
        onCopied={() => {
          onCopied("email");
        }}
      />
      <CopyField label="Nombre" value={account.holder} copyable={false} />
      <CopyField label="Banco" value={account.bank} copyable={false} />
      <CopyField label="Tipo" value={account.accountType} copyable={false} />
    </BankTransferDetails>
  );
}

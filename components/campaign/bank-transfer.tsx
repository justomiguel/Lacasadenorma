"use client";

import type { ReactNode } from "react";

import { PaymentMethodCard } from "@/components/campaign/payment-method-card";
import { BrandLabel } from "@/components/design-system/brand-mark";
import { CopyField } from "@/components/design-system/copy-field";
import type { BrandId } from "@/content/brands";
import type { HelpContent } from "@/content/schema";

/**
 * Los datos para transferir, país por país.
 *
 * Van en una card: el logo y el nombre del banco (Brubank en Argentina,
 * Scotiabank en Chile). Adentro: una lista de filas con regla fina, la
 * etiqueta chica arriba, el dato grande y tabular, y el icono de copiar a
 * la derecha. Titular y documento no se copian —se leen para verificar— y
 * por eso no llevan acción.
 *
 * Las etiquetas están en castellano en los dos idiomas a propósito: son los
 * nombres que usa el banco, y quien transfiere desde afuera los necesita tal
 * como aparecen en la aplicación del banco.
 */
export function BankTransferDetails({
  heading,
  brand,
  children,
}: {
  heading: string;
  brand: Extract<BrandId, "brubank" | "scotiabank">;
  children: ReactNode;
}) {
  return (
    <PaymentMethodCard title={<BrandLabel id={brand}>{heading}</BrandLabel>}>
      {children}
    </PaymentMethodCard>
  );
}

export function ArgentinaTransfer({
  account,
  onCopied,
}: {
  account: HelpContent["accounts"]["AR"];
  onCopied: (campo: string) => void;
}) {
  return (
    <BankTransferDetails heading={account.bank} brand="brubank">
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
  onCopied,
}: {
  account: HelpContent["accounts"]["CL"];
  onCopied: (campo: string) => void;
}) {
  return (
    <BankTransferDetails heading={account.bank} brand="scotiabank">
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

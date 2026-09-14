"use client";

import type { ReactNode } from "react";

import { PaymentMethodCard } from "@/components/campaign/payment-method-card";
import { CopyField } from "@/components/design-system/copy-field";
import { BankIcon } from "@/components/design-system/icons";
import type { HelpContent } from "@/content/schema";

/**
 * Los datos para transferir, país por país.
 *
 * Van en una card con el icono de banco y el título del canal, para no
 * confundirse con Mercado Pago. Adentro: una lista de filas con regla fina, la
 * etiqueta chica arriba, el dato grande y tabular, y el icono de copiar a la
 * derecha. Titular y documento no se copian —se leen para verificar— y por eso
 * no llevan acción.
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
  children: ReactNode;
}) {
  return (
    <PaymentMethodCard
      title={
        <>
          <BankIcon className="shrink-0" />
          {heading}
        </>
      }
    >
      {children}
    </PaymentMethodCard>
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

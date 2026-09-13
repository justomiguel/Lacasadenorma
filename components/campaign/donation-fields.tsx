"use client";

import { CopyField } from "@/components/design-system/copy-field";
import { useUiOptional } from "@/components/i18n/ui-provider";
import type { HelpContent } from "@/content/schema";

import { ChannelLabel, Flag, type Country } from "./donation-board-helpers";

export function ArgentinaFields({
  account,
  onCopied,
}: {
  account: HelpContent["accounts"]["AR"];
  onCopied: (campo: string) => void;
}) {
  const ui = useUiOptional()?.ui;

  return (
    <div>
      <h3 className="flex items-center gap-sm font-ui text-subheading font-medium">
        <Flag country="AR" />
        {ui?.countries.AR ?? "Argentina"}
      </h3>
      <div className="mt-md">
        <CopyField label="Titular" value={account.holder} copyable={false} />
        <CopyField label="CUIT/CUIL" value={account.taxId} copyable={false} />
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
      </div>
    </div>
  );
}

export function ChileFields({
  account,
  onCopied,
}: {
  account: HelpContent["accounts"]["CL"];
  onCopied: (campo: string) => void;
}) {
  const ui = useUiOptional()?.ui;

  return (
    <div>
      <h3 className="flex items-center gap-sm font-ui text-subheading font-medium">
        <Flag country="CL" />
        {ui?.countries.CL ?? "Chile"}
      </h3>
      <div className="mt-md">
        <CopyField label="Nombre" value={account.holder} copyable={false} />
        <CopyField
          label="RUT"
          value={account.rut}
          onCopied={() => {
            onCopied("rut");
          }}
        />
        <CopyField label="Banco" value={account.bank} copyable={false} />
        <CopyField label="Tipo" value={account.accountType} copyable={false} />
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
      </div>
    </div>
  );
}

export function MercadoPagoCountryCard({
  country,
  countryName,
  cta,
  onOpen,
  url,
}: {
  country: Country;
  countryName: string;
  cta: string;
  onOpen: () => void;
  url: string | null;
}) {
  return (
    <div className="rounded-md bg-paper-sunk p-lg">
      <h3 className="flex items-center gap-sm font-ui text-subheading font-medium">
        <Flag country={country} />
        {countryName}
      </h3>
      {url === null ? null : (
        <a
          href={url}
          rel="noopener noreferrer"
          target="_blank"
          className="lift-hover mt-lg inline-flex min-h-touch items-center rounded-pill bg-forest px-lg font-ui text-small font-medium text-paper"
          onClick={onOpen}
        >
          <ChannelLabel channel="mercadopago">{cta} →</ChannelLabel>
        </a>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";

import { CopyField } from "@/components/design-system/copy-field";
import { CountryTabs, type CountryPanel } from "@/components/design-system/country-tabs";
import { EmptyState } from "@/components/design-system/callout";
import type { CountryCode, PaymentMethod } from "@/src/domain/entities";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * Las formas publicadas de colaborar.
 *
 * Es el componente que decide si el proyecto funciona. Tres reglas lo gobiernan:
 *
 * 1. **Una lista vacía se explica.** Que no haya cuentas publicadas no es un
 *    error: es que todavía no se verificó ninguna. Mostrar una cuenta sin
 *    verificar sería el peor fallo posible del sitio (amenaza T1), así que la
 *    ausencia se dice con palabras.
 * 2. **El país se sugiere, no se impone.** Se elige el del idioma del navegador
 *    cuando coincide con alguno disponible, y las tres opciones siguen visibles.
 * 3. **Sin JavaScript se transfiere igual.** `CountryTabs` renderiza los tres
 *    países en el HTML servido y recién después se convierte en pestañas.
 */

/**
 * País sugerido a partir del idioma del navegador. No es geolocalización y no
 * pretende serlo: `es-CL` sugiere Chile, `en-US` sugiere Estados Unidos, y
 * cualquier otra cosa cae en el primer país disponible. Si acierta, quien llegó
 * ahorra un toque; si no, la opción correcta está a un toque de distancia.
 */
function detectPreferredCountry(
  available: readonly CountryCode[],
): CountryCode | undefined {
  const fallback = available[0];

  if (typeof navigator === "undefined") {
    return fallback;
  }

  const region = new Intl.Locale(navigator.language).region;
  const match = available.find((country) => country === region);

  return match ?? fallback;
}

function MethodDetail({
  method,
  onCopied,
}: {
  method: PaymentMethod;
  onCopied: (country: CountryCode, field: string) => void;
}) {
  return (
    <div>
      <p className="font-ui text-label text-ink-muted">
        {method.label} ({method.currency})
      </p>

      <div className="mt-md">
        {method.fields.map((field) =>
          field.copyable ? (
            <CopyField
              key={field.label}
              label={field.label}
              value={field.value}
              hint={field.hint}
              onCopied={() => {
                onCopied(method.countryCode, field.label);
              }}
            />
          ) : (
            <div key={field.label} className="border-b border-rule py-sm">
              <p className="font-ui text-label text-ink-muted">{field.label}</p>
              <p className="mt-3xs font-ui text-subheading font-medium">{field.value}</p>
              {field.hint === null ? null : (
                <p className="mt-3xs font-ui text-small text-ink-muted">{field.hint}</p>
              )}
            </div>
          ),
        )}
      </div>

      {method.instructions === null ? null : (
        <p className="mt-md max-w-measure text-small text-ink-muted">
          {method.instructions}
        </p>
      )}
    </div>
  );
}

export function DonationMethods({
  methods,
  countries,
  className,
}: {
  methods: readonly PaymentMethod[];
  countries: readonly CountryCode[];
  className?: string;
}) {
  const onCopied = useCallback((country: CountryCode, field: string) => {
    // Nunca el valor copiado: sólo el país y el tipo de campo (ADR-010).
    track({ name: "dato_copiado", props: { pais: country, campo: field } });
  }, []);

  const onCountryShown = useCallback((country: CountryCode) => {
    track({ name: "metodo_visto", props: { pais: country } });
  }, []);

  if (methods.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay una cuenta publicada"
        {...(className === undefined ? {} : { className })}
      >
        <p>
          Estamos verificando los datos bancarios antes de publicarlos. Preferimos que
          esta sección esté vacía unos días a que aparezca un dato que después haya que
          corregir: si alguien transfiere a la cuenta equivocada, el error no se deshace.
        </p>
      </EmptyState>
    );
  }

  const panels: CountryPanel[] = countries
    .filter((country) => methods.some((method) => method.countryCode === country))
    .map((country) => ({
      country,
      content: (
        <div className="space-y-2xl">
          {methods
            .filter((method) => method.countryCode === country)
            .map((method) => (
              <MethodDetail key={method.id} method={method} onCopied={onCopied} />
            ))}
        </div>
      ),
    }));

  const preferred = detectPreferredCountry(panels.map((panel) => panel.country));

  return (
    <CountryTabs
      panels={panels}
      {...(preferred === undefined ? {} : { initialCountry: preferred })}
      onCountryShown={onCountryShown}
      {...(className === undefined ? {} : { className })}
    />
  );
}

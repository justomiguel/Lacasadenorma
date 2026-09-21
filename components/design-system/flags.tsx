/**
 * Banderas de Argentina, Chile y Estados Unidos, y el globo del resto del mundo.
 *
 * Las banderas no son iconos del sistema: tienen los colores de cada país, no
 * `currentColor`. El globo sí: es trazo. El nombre del país ya está en el
 * texto; acá son marca visual (ADR-047).
 */

import { cn } from "./cn";
import { IdentifyingMark } from "./identifying-mark";
import { GlobeIcon } from "./icons";

export function CountryFlag({
  country,
  className,
}: {
  country: "AR" | "CL";
  className?: string;
}) {
  return (
    <svg
      data-flag={country}
      aria-hidden="true"
      width={24}
      height={16}
      viewBox="0 0 36 24"
      className={cn("identifying-flag", className)}
    >
      {country === "AR" ? <ArgentinaFlagMarks /> : <ChileFlagMarks />}
    </svg>
  );
}

/**
 * Bandera del idioma publicado: Argentina para el castellano (es-AR),
 * Estados Unidos para el inglés (el corredor que lo justifica, ADR-023).
 * El nombre del idioma lo dice el texto; acá es marca (ADR-047).
 */
export function LocaleFlag({ locale }: { locale: "es" | "en" }) {
  if (locale === "es") {
    return <CountryFlag country="AR" />;
  }

  return (
    <svg
      data-flag="US"
      aria-hidden="true"
      width={24}
      height={16}
      viewBox="0 0 36 24"
      className="identifying-flag"
    >
      <UnitedStatesFlagMarks />
    </svg>
  );
}

/** Marca de un país de aporte: bandera o globo, nunca sola, siempre al lado del nombre. */
export function CountryMark({ region }: { region: "AR" | "CL" | "INT" }) {
  if (region === "INT") {
    return (
      <IdentifyingMark data-country-mark="INT" className="text-olive">
        <GlobeIcon />
      </IdentifyingMark>
    );
  }

  return <CountryFlag country={region} />;
}

function ArgentinaFlagMarks() {
  return (
    <>
      <rect width="36" height="8" fill="#74acdf" />
      <rect y="8" width="36" height="8" fill="#fff" />
      <rect y="16" width="36" height="8" fill="#74acdf" />
      <circle cx="18" cy="12" r="2.2" fill="#f6b40e" />
    </>
  );
}

function UnitedStatesFlagMarks() {
  return (
    <>
      <rect width="36" height="24" fill="#bf0a30" />
      <rect y="3" width="36" height="3" fill="#fff" />
      <rect y="9" width="36" height="3" fill="#fff" />
      <rect y="15" width="36" height="3" fill="#fff" />
      <rect y="21" width="36" height="3" fill="#fff" />
      <rect width="14" height="13" fill="#002868" />
      <circle cx="3.5" cy="3.2" r="0.7" fill="#fff" />
      <circle cx="7" cy="3.2" r="0.7" fill="#fff" />
      <circle cx="10.5" cy="3.2" r="0.7" fill="#fff" />
      <circle cx="5.2" cy="6.5" r="0.7" fill="#fff" />
      <circle cx="8.8" cy="6.5" r="0.7" fill="#fff" />
      <circle cx="3.5" cy="9.8" r="0.7" fill="#fff" />
      <circle cx="7" cy="9.8" r="0.7" fill="#fff" />
      <circle cx="10.5" cy="9.8" r="0.7" fill="#fff" />
    </>
  );
}

function ChileFlagMarks() {
  return (
    <>
      <rect width="36" height="24" fill="#fff" />
      <rect y="12" width="36" height="12" fill="#d52b1e" />
      <rect width="12" height="12" fill="#0039a6" />
      <polygon
        fill="#fff"
        points="6,2.6 6.85,5.2 9.6,5.2 7.4,6.8 8.25,9.4 6,7.8 3.75,9.4 4.6,6.8 2.2,5.2 4.95,5.2"
      />
    </>
  );
}

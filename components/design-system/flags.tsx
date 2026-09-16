/**
 * Banderas de Argentina y Chile, y el globo del resto del mundo.
 *
 * Las banderas no son iconos del sistema: tienen los colores de cada país, no
 * `currentColor`. El globo sí: es trazo. El nombre del país ya está en el
 * texto; acá son marca visual (ADR-047).
 */

import { cn } from "./cn";
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
      className={cn("h-md w-lg shrink-0", className)}
    >
      {country === "AR" ? <ArgentinaFlagMarks /> : <ChileFlagMarks />}
    </svg>
  );
}

/** Marca de un país de aporte: bandera o globo, nunca sola, siempre al lado del nombre. */
export function CountryMark({ region }: { region: "AR" | "CL" | "INT" }) {
  if (region === "INT") {
    return (
      <span data-country-mark="INT" className="inline-flex shrink-0 text-olive">
        <GlobeIcon size={16} />
      </span>
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

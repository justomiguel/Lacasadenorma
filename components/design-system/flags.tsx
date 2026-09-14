/**
 * Banderas de Argentina y Chile, para el botón de Mercado Pago.
 *
 * No son iconos del sistema: tienen los colores de cada bandera, no `currentColor`.
 * El nombre del país ya está en el texto accesible del botón; acá son marca
 * visual para quien elige entre el link argentino y el chileno.
 */

export function CountryFlag({ country }: { country: "AR" | "CL" }) {
  return (
    <svg
      data-flag={country}
      aria-hidden="true"
      width={24}
      height={16}
      viewBox="0 0 36 24"
      className="h-md w-lg shrink-0"
    >
      {country === "AR" ? <ArgentinaFlagMarks /> : <ChileFlagMarks />}
    </svg>
  );
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

import type { ReactNode, SVGProps } from "react";

/**
 * Pictogramas del menú de trabajo (backoffice y cuenta).
 *
 * Viven acá para no pasar el `max-lines` de `icons.tsx`. La familia es la
 * misma: trazo 1.5, viewBox 24, sin relleno. Se reexportan desde `icons.tsx`.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Svg({ size = 20, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </Svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v16" />
      <path d="M6 5h10.5l-1.6 3.2 1.6 3.3H6" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M4 14h16" />
      <path d="M12 10v10" />
      <path d="M12 10c0-3 2.2-4.5 4-3.5S16 10 12 10c0-3-2.2-4.5-4-3.5S8 10 12 10z" />
    </Svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10v16l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z" />
      <path d="M9.5 9h5" />
      <path d="M9.5 12.5h5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

import type { ReactNode, SVGProps } from "react";

/**
 * Una sola familia de iconos: trazo de 1.5, esquinas redondas, viewBox 24.
 *
 * Los que identifican van **antes del nombre**, a 1.15 em de esa letra, en
 * `IdentifyingMark` (ADR-047). El default de 20 px queda para las acciones
 * (copiar, cerrar, menú, flecha) dentro de `ICON_ACTION`. Los bancos son
 * marcas (`content/brands.ts`). Las banderas, `flags.tsx`. Sin relleno ni packs.
 */

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

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

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth="1.8">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8" />
      <path d="M4 12h16" />
    </Svg>
  );
}

export function BankIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 10 8-6 8 6" />
      <path d="M6 10v8" />
      <path d="M10 10v8" />
      <path d="M14 10v8" />
      <path d="M18 10v8" />
      <path d="M4 18h16" />
    </Svg>
  );
}

export function AtIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M15 12v1.6a2 2 0 0 0 3.8.6A7 7 0 1 0 12 19" />
    </Svg>
  );
}

export function HashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 5-2 14" />
      <path d="m17 5-2 14" />
      <path d="M5 9h16" />
      <path d="M4 15h16" />
    </Svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.6-3.4 4-5 7-5s5.4 1.6 7 5" />
    </Svg>
  );
}

export function IdIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 10h5" />
      <path d="M14 14h4" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
      <path d="m4 8 8 6 8-6" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M11 6h2" />
      <path d="M11 18h2" />
    </Svg>
  );
}

export function HandsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 11V8.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V7.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.5V8.5a1.5 1.5 0 1 1 3 0V13" />
      <path d="M8 11c0 3.5 1.8 7 4 7s4-3.5 4-7" />
    </Svg>
  );
}

export function BanknoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
    </Svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h16v11H4z" />
      <path d="m4 8 8-4 8 4" />
      <path d="M12 4v15" />
    </Svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 14 8 4 8-4" />
      <path d="m4 10 8 4 8-4" />
      <path d="m4 6 8 4 8-4" />
    </Svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1" />
      <rect x="13" y="4.5" width="6.5" height="6.5" rx="1" />
      <rect x="4.5" y="13" width="6.5" height="6.5" rx="1" />
      <rect x="13" y="13" width="6.5" height="6.5" rx="1" />
    </Svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19V10" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </Svg>
  );
}

export function LeaveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H9" />
      <path d="M10 12h9" />
      <path d="m16 8 4 4-4 4" />
    </Svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12s3.2-7 9-7 9 7 9 7-3.2 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5.5 18.5 9 8 19.5H4.5V16Z" />
      <path d="m13 7.5 3.5 3.5" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7h14" />
      <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7" />
      <path d="M8 7v11.5A1.5 1.5 0 0 0 9.5 20h5a1.5 1.5 0 0 0 1.5-1.5V7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </Svg>
  );
}

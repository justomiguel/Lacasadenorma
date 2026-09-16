import type { ReactNode, SVGProps } from "react";

/**
 * Una sola familia de iconos: trazo de 1.5, esquinas redondas, 20 px.
 *
 * Son pocos a propósito. Un icono entra cuando aclara una acción (copiar,
 * cerrar, salir), reduce texto (la flecha del enlace) o mejora el barrido
 * (el menú, y el bloque de cuenta del drawer). Los bancos de la transferencia son marcas, no pictogramas: van en
 * `content/brands.ts`. No hay iconos de relleno.
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

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5c1.2-3.2 3.5-4.5 6.5-4.5s5.3 1.3 6.5 4.5" />
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

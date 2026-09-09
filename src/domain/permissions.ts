import { hasMinRole, type AppRole } from "./entities/role";

/**
 * Qué puede hacer cada rol.
 *
 * Esta tabla es un **espejo** de la matriz de RLS de `data-model.md`, no la
 * frontera. La frontera está en la base: aunque alguien saltee esta comprobación,
 * la policy rechaza la escritura. Existir en dos lugares es intencional y no es
 * duplicación por descuido: sin esto, el backoffice le ofrecería a un editor un
 * botón de "registrar gasto" que la base va a rechazar, y un formulario que falla
 * al enviarse es peor que un formulario que no aparece.
 *
 * Hay un test que compara esta tabla con la matriz de la spec, y hay pruebas pgTAP
 * que verifican el lado de la base. Si las dos se separan, algo falla.
 *
 * Por qué no alcanza con la jerarquía numérica: `auditor` es el rol de lectura
 * total sin ninguna escritura. Con `hasMinRole('auditor')` a secas, un auditor
 * pasaría cualquier comprobación de "al menos auditor", incluidas las de escritura.
 * Las capacidades se declaran una por una por eso.
 */

export const PERMISSIONS = [
  /** Entrar al backoffice. Cualquier rol interno puede. */
  "backoffice.acceder",
  /** Ver aportes y gastos individuales, y los comprobantes. */
  "finanzas.leer",
  /** Registrar y anular aportes, gastos y comprobantes. */
  "finanzas.escribir",
  /** Crear, editar y publicar novedades, fotos y personas. */
  "contenido.escribir",
  /** Crear y editar hitos de obra. */
  "hitos.escribir",
  /** Editar objetivo, presupuesto y datos de la campaña. */
  "campana.escribir",
  /** Administrar cuentas bancarias. La operación de mayor impacto del sistema. */
  "cuentas.escribir",
  /** Ver el registro de auditoría. */
  "auditoria.leer",
  /** Otorgar y quitar roles. */
  "roles.escribir",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * La tabla, escrita como "qué rol mínimo hace falta" o como la lista explícita de
 * roles cuando la jerarquía no lo describe.
 *
 * `cuentas.escribir` es sólo de `owner`, y es la única entrada de la tabla que se
 * justifica sola: quien pueda cambiar un CBU puede desviar todos los aportes de la
 * campaña. No hay razón para que un `admin` lo pueda hacer.
 */
const RULES: Record<Permission, readonly AppRole[]> = {
  "backoffice.acceder": ["auditor", "editor", "admin", "owner"],
  "finanzas.leer": ["auditor", "admin", "owner"],
  "finanzas.escribir": ["admin", "owner"],
  "contenido.escribir": ["editor", "admin", "owner"],
  "hitos.escribir": ["editor", "admin", "owner"],
  "campana.escribir": ["admin", "owner"],
  "cuentas.escribir": ["owner"],
  "auditoria.leer": ["auditor", "admin", "owner"],
  "roles.escribir": ["owner"],
};

export function can(role: AppRole | null, permission: Permission): boolean {
  if (role === null) {
    return false;
  }

  return RULES[permission].includes(role);
}

/**
 * Las capacidades de un rol, para armar la navegación del backoffice.
 *
 * Se deriva de la misma tabla en lugar de escribirse aparte: una navegación que
 * muestra un enlace que después rechaza es un error de producto, no de seguridad,
 * pero es igual de evitable.
 */
export function permissionsOf(role: AppRole | null): readonly Permission[] {
  return PERMISSIONS.filter((permission) => can(role, permission));
}

export { hasMinRole };

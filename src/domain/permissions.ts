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
  /** Crear, editar y publicar ítems del catálogo de donaciones: qué falta y cuánto. */
  "catalogo.escribir",
  /** Ver quién se comprometió a donar qué, con su contacto y su nota privada. */
  "donaciones.leer",
  /** Confirmar la llegada de una donación y cancelar una reserva con motivo. */
  "donaciones.escribir",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * La tabla, escrita como "qué rol mínimo hace falta" o como la lista explícita de
 * roles cuando la jerarquía no lo describe.
 *
 * `cuentas.escribir` es sólo de `owner`, y es la única entrada de la tabla que se
 * justifica sola: quien pueda cambiar un CBU puede desviar todos los aportes de la
 * campaña. No hay razón para que un `admin` lo pueda hacer.
 *
 * `donaciones.leer` tiene la misma forma que `finanzas.leer` —`auditor`, `admin`,
 * `owner`, y `editor` afuera— y por la misma razón: `editor` está por encima de
 * `auditor` en la jerarquía, así que cualquier permiso resuelto por rango le
 * abriría los nombres, los correos y las notas privadas de quien se comprometió a
 * donar algo. El catálogo y las reservas son dos cosas distintas: `editor`
 * administra la primera con `catalogo.escribir` y no accede a la segunda. Su
 * espejo en la base es `private.can_read_donors()`.
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
  "catalogo.escribir": ["editor", "admin", "owner"],
  "donaciones.leer": ["auditor", "admin", "owner"],
  "donaciones.escribir": ["admin", "owner"],
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

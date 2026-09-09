/**
 * Las acciones que se registran en la auditoría, con su nombre en castellano.
 *
 * Están acá y no como cadenas sueltas en cada caso de uso por dos razones.
 *
 * **La primera es la deriva.** `AuditTrail.action` escrito como `string` acepta
 * `"expense.creted"` sin protestar, y el síntoma aparece meses después: una fila del
 * registro sin descripción, justo cuando alguien está reconstruyendo qué pasó con un
 * gasto. Tipar la clave convierte ese error en un error de compilación.
 *
 * **La segunda es que el registro se lee.** No es telemetría: es la pantalla que
 * contesta "¿quién cambió esto?" cuando una cifra no cuadra. Una fila que dice
 * `payment_method.published` obliga a traducir mentalmente; una que dice "publicó una
 * cuenta bancaria" se entiende.
 *
 * Los verbos van en pasado y en tercera persona, porque la fila se lee como una
 * oración: *Nombre · publicó una cuenta bancaria · hace dos horas*.
 */
export const AUDIT_ACTION_LABELS = {
  "campaign.goal_updated": "cambió el objetivo de recaudación",
  "campaign.reconciled": "marcó la conciliación bancaria",
  "budget_item.created": "agregó un rubro al presupuesto",
  "budget_item.updated": "editó un rubro del presupuesto",
  "contribution.created": "registró un aporte",
  "contribution.voided": "anuló un aporte",
  "expense.created": "registró un gasto",
  "expense.voided": "anuló un gasto",
  "expense.receipt_attached": "archivó un comprobante",
  "expense.receipt_viewed": "abrió un comprobante",
  "update.published": "publicó una novedad",
  "update.unpublished": "despublicó una novedad",
  "payment_method.created": "cargó una cuenta bancaria",
  "payment_method.updated": "editó una cuenta bancaria",
  "payment_method.published": "publicó una cuenta bancaria",
  "payment_method.unpublished": "dejó de publicar una cuenta bancaria",
} as const satisfies Record<string, string>;

export type AuditAction = keyof typeof AUDIT_ACTION_LABELS;

/**
 * La descripción de una acción leída de la base.
 *
 * Acepta cualquier cadena y no sólo `AuditAction` a propósito: el registro es
 * inmutable y permanente, así que va a contener acciones escritas por versiones
 * anteriores del código, incluidas las que se renombraron. Devolver la cadena cruda es
 * peor que una traducción y mucho mejor que una fila vacía: la fila sigue existiendo y
 * sigue diciendo algo (principio XII).
 */
export function describeAuditAction(action: string): string {
  return action in AUDIT_ACTION_LABELS
    ? AUDIT_ACTION_LABELS[action as AuditAction]
    : action;
}

/** El nombre de la tabla, para quien lee la auditoría y no conoce el esquema. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  campaigns: "Campaña",
  budget_items: "Presupuesto",
  contributions: "Aportes",
  expenses: "Gastos",
  expense_receipts: "Comprobantes",
  updates: "Novedades",
  milestones: "Hitos",
  payment_methods: "Cuentas",
};

export function describeAuditEntity(entityTable: string): string {
  return AUDIT_ENTITY_LABELS[entityTable] ?? entityTable;
}

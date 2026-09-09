/**
 * Las operaciones del backoffice, en un solo lugar.
 *
 * Cada una recibe `AdminDeps` y un `input` sin tipar —lo que llega de un
 * `FormData`— y devuelve un `AdminResult`. Esa uniformidad es lo que permite que las
 * Server Actions de `app/admin` sean tres líneas cada una y que la validación, la
 * autorización y el registro de auditoría no dependan de que quien escriba la
 * próxima pantalla se acuerde de hacerlos.
 */

export { perform } from "./core";
export type { Actor, AdminDeps, AdminResult, AuditTrail, FieldErrors } from "./core";

export { saveBudgetItem, updateGoal } from "./campaign";
export { markReconciled, recordContribution, voidContribution } from "./contributions";
export {
  attachExpenseReceipt,
  createReceiptLink,
  recordExpense,
  voidExpense,
} from "./expenses";
export { saveMilestone } from "./milestones";
export { savePaymentMethod, setPaymentMethodPublished } from "./payment-methods";
export { addUpdatePhoto, saveUpdate, setUpdatePublished } from "./updates";

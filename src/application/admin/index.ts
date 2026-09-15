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

export { createCampaign, saveBudgetItem, updateGoal } from "./campaign";
export { markReconciled, recordContribution, voidContribution } from "./contributions";
export {
  attachExpenseReceipt,
  openReceipt,
  ReceiptNotFoundError,
  recordExpense,
  voidExpense,
} from "./expenses";
export { saveMilestone } from "./milestones";
export { saveDonationItem } from "./catalog";
export { reviewDonorAccount } from "./donors";
export type { ReviewAccountMail } from "./donors";
export { cancelPledge, fulfillPledge } from "./pledges";
export type { PledgeMail } from "./pledges";
export { savePaymentMethod, setPaymentMethodPublished } from "./payment-methods";
export {
  addUpdateMedia,
  addUpdatePhoto,
  saveUpdate,
  setUpdatePublished,
} from "./updates";

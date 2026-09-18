import type { DonorProfile } from "@/src/domain/entities/donor";
import { buildAccountEmail, buildStaffEmail } from "@/src/application/emails/messages";
import { localizeHref } from "@/src/i18n/locale";

import { getEmailSender, readStaffAddress } from "../email";
import { recordEmailDelivery } from "../email/deliveries";
import { getSiteUrl } from "../site-url";
import { readViewer } from "../auth/viewer";

/**
 * Avisa que nació un pedido de cuenta: a la persona y al equipo (ADR-033).
 *
 * No lanza hacia afuera. Un fallo de correo no puede impedir que la cuenta
 * exista (FR-233).
 */
export async function notifyAccountOpened(profile: DonorProfile): Promise<void> {
  const viewer = await readViewer();
  const recipient = viewer?.email;

  if (recipient === undefined || recipient === null) {
    return;
  }

  const sender = getEmailSender();
  const siteUrl = getSiteUrl();
  const accountUrl = `${siteUrl}${localizeHref("/cuenta", profile.locale)}`;

  const toPerson = buildAccountEmail("account.received", {
    userId: profile.userId,
    recipient,
    locale: profile.locale,
    accountUrl,
  });
  const personResult = await sender.send("account.received", toPerson);

  await recordEmailDelivery({
    kind: "account.received",
    subjectId: profile.userId,
    result: personResult,
    userId: profile.userId,
  });

  const staffAddress = readStaffAddress();

  if (staffAddress === null) {
    return;
  }

  const toStaff = buildStaffEmail("staff.new_account", {
    subjectId: profile.userId,
    staffAddress,
    what: null,
    backofficeUrl: `${siteUrl}/admin/donantes`,
  });
  const staffResult = await sender.send("staff.new_account", toStaff);

  await recordEmailDelivery({
    kind: "staff.new_account",
    subjectId: profile.userId,
    result: staffResult,
    userId: profile.userId,
  });
}

import type { DonationPledge } from "@/src/domain/entities/donation-pledge";
import { buildPledgeEmail, buildStaffEmail } from "@/src/application/emails/messages";
import type { Locale } from "@/src/i18n/locale";
import { localizeHref } from "@/src/i18n/locale";

import { readViewer } from "../auth/viewer";
import { getEmailSender, readStaffAddress } from "../email";
import { recordEmailDelivery } from "../email/deliveries";
import { getSiteUrl } from "../site-url";

/**
 * Avisa la reserva: a la persona y al equipo (ADR-028).
 *
 * No lanza hacia afuera. Un fallo de correo no puede deshacer la reserva
 * (FR-233).
 */
export async function notifyPledgeClaimed(
  pledge: DonationPledge,
  locale: Locale,
): Promise<void> {
  const viewer = await readViewer();
  const recipient = viewer?.email;

  if (recipient === undefined || recipient === null) {
    return;
  }

  const sender = getEmailSender();
  const siteUrl = getSiteUrl();
  const accountUrl = `${siteUrl}${localizeHref("/cuenta", locale)}`;
  const expiresOn = formatWhen(pledge.expiresAt, locale);

  const toPerson = buildPledgeEmail("pledge.confirmed", {
    pledgeId: pledge.id,
    recipient,
    locale,
    what: pledge.itemTitle,
    expiresOn,
    accountUrl,
  });
  const personResult = await sender.send("pledge.confirmed", toPerson);

  await recordEmailDelivery({
    kind: "pledge.confirmed",
    subjectId: pledge.id,
    result: personResult,
  });

  const staffAddress = readStaffAddress();

  if (staffAddress === null) {
    return;
  }

  const toStaff = buildStaffEmail("staff.new_pledge", {
    subjectId: pledge.id,
    staffAddress,
    what: pledge.itemTitle,
    backofficeUrl: `${siteUrl}/admin/donaciones`,
  });
  const staffResult = await sender.send("staff.new_pledge", toStaff);

  await recordEmailDelivery({
    kind: "staff.new_pledge",
    subjectId: pledge.id,
    result: staffResult,
  });
}

function formatWhen(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

import type { DonationOffer } from "@/src/domain/entities/donation-offer";
import { buildStaffEmail } from "@/src/application/emails/messages";
import { staffPledgeDecisionPath } from "@/src/domain/staff-pledge-decision";

import { getEmailSender, readStaffAddress } from "../email";
import { recordEmailDelivery } from "../email/deliveries";
import { getSiteUrl } from "../site-url";

/**
 * Avisa al owner que alguien dejó un teléfono y el ítem quedó reservado
 * (ADR-051). El nombre va en el correo: es el motivo de este camino. El
 * número viaja como botón de WhatsApp. Un fallo no borra la reserva (FR-233).
 */
export async function notifyPhoneOffer(offer: DonationOffer): Promise<void> {
  const staffAddress = readStaffAddress();

  if (staffAddress === null || offer.pledgeId === null) {
    return;
  }

  const sender = getEmailSender();
  const siteUrl = getSiteUrl();
  const toStaff = buildStaffEmail("staff.phone_offer", {
    subjectId: offer.pledgeId,
    staffAddress,
    what: offer.itemTitle,
    who: offer.contactName,
    phone: offer.contactPhone,
    backofficeUrl: `${siteUrl}/admin/donaciones`,
    yesUrl: `${siteUrl}${staffPledgeDecisionPath(offer.pledgeId, "si")}`,
    noUrl: `${siteUrl}${staffPledgeDecisionPath(offer.pledgeId, "no")}`,
  });
  const staffResult = await sender.send("staff.phone_offer", toStaff);

  await recordEmailDelivery({
    kind: "staff.phone_offer",
    subjectId: offer.pledgeId,
    result: staffResult,
  });
}

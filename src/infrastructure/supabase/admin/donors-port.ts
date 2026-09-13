import {
  isApprovalStatus,
  type DonorAccountAdminRecord,
} from "@/src/domain/entities/donor";
import { isLocale } from "@/src/i18n/locale";
import type { AdminDonorPort } from "@/src/domain/ports/admin";

import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

const COLUMNS =
  "id, display_name, locale, default_anonymous, approval_status, created_at, reviewed_at, review_note";

export function createDonorsPort(client: ServerSupabaseClient): AdminDonorPort {
  return {
    async listAccounts(): Promise<readonly DonorAccountAdminRecord[]> {
      const { data, error } = await client
        .from("donor_profiles")
        .select(COLUMNS)
        .order("created_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer las cuentas del público", error);
      }

      const rows = await Promise.all(
        data.map(async (row) => {
          const { data: email, error: contactError } = await client.rpc("donor_contact", {
            p_user_id: row.id,
          });

          if (contactError !== null) {
            throw new QueryError("leer el correo de contacto", contactError);
          }

          return mapAccount(row, typeof email === "string" ? email : null);
        }),
      );

      return rows;
    },

    async reviewAccount(input): Promise<void> {
      const { error } = await client.rpc("review_donor_account", {
        p_user_id: input.userId,
        p_decision: input.decision,
        // El generador no admite `null` en un argumento con default; el esquema sí.
        p_note: input.note as string,
      });

      if (error !== null) {
        throw new QueryError("revisar la cuenta", error);
      }
    },

    async contactOf(userId): Promise<string | null> {
      const { data, error } = await client.rpc("donor_contact", { p_user_id: userId });

      if (error !== null) {
        throw new QueryError("leer el correo de contacto", error);
      }

      return typeof data === "string" ? data : null;
    },
  };
}

interface AccountRow {
  id: string;
  display_name: string | null;
  locale: string;
  default_anonymous: boolean;
  approval_status: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

function mapAccount(row: AccountRow, email: string | null): DonorAccountAdminRecord {
  return {
    userId: row.id,
    email,
    displayName: row.display_name,
    locale: isLocale(row.locale) ? row.locale : "es",
    defaultAnonymous: row.default_anonymous,
    approvalStatus: isApprovalStatus(row.approval_status)
      ? row.approval_status
      : "pending",
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

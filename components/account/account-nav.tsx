import { signOut } from "@/app/(es)/cuenta/actions";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { LeaveIcon } from "@/components/design-system/icons";
import { PendingTextButton } from "@/components/design-system/pending-submit";
import { sidebarSignOutClass } from "@/components/design-system/work-sidebar";
import type { Locale } from "@/src/i18n/locale";

import { LocaleField } from "./fields";

/** Cerrar sesión desde el menú de `/cuenta`. */
export function AccountSignOut({
  locale,
  label,
  pendingLabel,
}: {
  locale: Locale;
  label: string;
  pendingLabel: string;
}) {
  return (
    <form action={signOut}>
      <LocaleField locale={locale} />
      <PendingTextButton
        pendingLabel={pendingLabel}
        className={sidebarSignOutClass()}
        icon={
          <IdentifyingMark>
            <LeaveIcon />
          </IdentifyingMark>
        }
      >
        {label}
      </PendingTextButton>
    </form>
  );
}

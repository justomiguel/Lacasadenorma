import { AuthShell } from "@/components/account/auth-shell";
import { PasswordForm, RecoverForm } from "@/components/account/recovery-forms";
import { InlineLink } from "@/components/design-system/actions";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { readViewer } from "@/src/infrastructure/auth/viewer";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Recuperar el acceso: pedir el enlace y, del otro lado del correo, fijar la
 * contraseña.
 */

export function recoverMetadata(locale: Locale) {
  const { account } = getContent(locale);

  return pageMetadata({
    locale,
    title: account.recover.title,
    description: account.recover.seoDescription,
    path: "/cuenta/recuperar",
    noIndex: true,
  });
}

export function RecoverScreen({ locale }: { locale: Locale }) {
  const { account } = getContent(locale);
  const { recover, fields, errors } = account;

  return (
    <AuthShell
      title={recover.title}
      lead={recover.lead}
      aside={
        <InlineLink href={localizedHref("/cuenta/ingresar", locale)}>
          {recover.back}
        </InlineLink>
      }
    >
      <RecoverForm copy={recover} errors={errors} fields={fields} locale={locale} />
    </AuthShell>
  );
}

export function passwordMetadata(locale: Locale) {
  const { account } = getContent(locale);

  return pageMetadata({
    locale,
    title: account.password.title,
    description: account.password.seoDescription,
    path: "/cuenta/clave",
    noIndex: true,
  });
}

/**
 * Sin la sesión que crea el enlace del correo, esta pantalla no tiene nada que
 * hacer, y lo dice en lugar de mostrar un formulario que va a fallar al enviarse.
 * Un estado sin diseñar es un bug abierto (principio XII).
 *
 * La comprobación se repite en la acción, y no es redundancia: la pantalla evita
 * el camino inútil, la acción es la que no se puede saltear con una invocación
 * directa por el ID de la acción (amenaza T7).
 */
export async function PasswordScreen({ locale }: { locale: Locale }) {
  const { account } = getContent(locale);
  const { password, fields, errors } = account;
  const viewer = await readViewer();

  if (viewer === null) {
    return (
      <AuthShell
        title={password.noSessionTitle}
        lead={password.noSessionBody[0] ?? password.lead}
      >
        <div className="max-w-measure space-y-lg">
          {password.noSessionBody.slice(1).map((text) => (
            <p key={text.slice(0, 32)} className="text-body text-ink-muted">
              {text}
            </p>
          ))}
          <InlineLink href={localizedHref("/cuenta/recuperar", locale)}>
            {password.request}
          </InlineLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={password.title} lead={password.lead}>
      <PasswordForm copy={password} errors={errors} fields={fields} locale={locale} />
    </AuthShell>
  );
}

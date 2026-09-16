import { AuthShell } from "@/components/account/auth-shell";
import { SignInForm, SignUpForm } from "@/components/account/credential-forms";
import { InlineLink } from "@/components/design-system/actions";
import { getContent } from "@/content";
import { accountHref } from "@/src/application/accounts/return-path";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { enabledSocialProviders } from "@/src/application/accounts/social-providers";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Crear una cuenta e ingresar.
 *
 * Las dos llevan `noIndex`. No es por pudor: una pantalla de acceso indexada no le
 * sirve a nadie que busque cómo ayudar a reconstruir la casa, y compite en los
 * resultados con las páginas que sí. Lo mismo hace `robots.ts` con la sección
 * entera, y las dos cosas juntas no son redundancia: `robots.txt` es una
 * sugerencia y la metaetiqueta es la que un rastreador ya en la página respeta.
 */

export function signUpMetadata(locale: Locale) {
  const { account } = getContent(locale);

  return pageMetadata({
    locale,
    title: account.signUp.title,
    description: account.signUp.seoDescription,
    path: "/cuenta/crear",
    noIndex: true,
  });
}

export function SignUpScreen({
  locale,
  returnTo,
  donateIntent,
}: {
  locale: Locale;
  returnTo?: string | null;
  donateIntent?: { readonly email: string } | null;
}) {
  const { account } = getContent(locale);
  const { signUp, fields, errors, social } = account;
  const providers = enabledSocialProviders();
  const fromDonate = donateIntent !== null && donateIntent !== undefined;
  const lead = fromDonate ? signUp.donateLead : signUp.lead;

  return (
    <AuthShell
      title={signUp.title}
      lead={lead}
      aside={
        <>
          {fromDonate
            ? signUp.donateWhy.map((text, index) => (
                <p key={text.slice(0, 32)} className={index === 0 ? undefined : "mt-md"}>
                  {text}
                </p>
              ))
            : null}
          <p className={fromDonate ? "mt-md" : undefined}>
            {signUp.privacyLead}{" "}
            <InlineLink href={localizedHref("/legales/privacidad", locale)}>
              {signUp.privacyLink}
            </InlineLink>
            {signUp.privacyTail}
          </p>
          <p className="mt-md">
            {signUp.haveAccount}{" "}
            <InlineLink href={accountHref("ingresar", locale, returnTo)}>
              {signUp.haveAccountLink}
            </InlineLink>
          </p>
        </>
      }
    >
      <SignUpForm
        copy={signUp}
        errors={errors}
        fields={fields}
        locale={locale}
        providers={providers}
        returnTo={returnTo ?? null}
        social={social}
        emailPrefill={donateIntent?.email ?? null}
      />
    </AuthShell>
  );
}

export function signInMetadata(locale: Locale) {
  const { account } = getContent(locale);

  return pageMetadata({
    locale,
    title: account.signIn.title,
    description: account.signIn.seoDescription,
    path: "/cuenta/ingresar",
    noIndex: true,
  });
}

export function SignInScreen({
  locale,
  notice,
  returnTo,
}: {
  locale: Locale;
  /** El código con el que llega quien vino de un enlace vencido, si vino de uno. */
  notice: string | null;
  /** A dónde volver después de ingresar. Sólo el catálogo pasa el filtro. */
  returnTo?: string | null;
}) {
  const { account } = getContent(locale);
  const { signIn, fields, errors, social } = account;
  const providers = enabledSocialProviders();

  // El aviso llega por la query desde `/cuenta/confirmar`, así que llega del
  // navegador y no se muestra tal cual: se busca en la tabla de mensajes, y una
  // clave que no está en la tabla no muestra nada. Sin esto, una URL con
  // `?aviso=<lo que sea>` pintaría texto ajeno en una pantalla de acceso, que es
  // media suplantación hecha.
  const aviso = notice !== null && notice in errors ? errors[notice as never] : null;

  return (
    <AuthShell
      title={signIn.title}
      lead={signIn.lead}
      aside={
        <>
          <p>
            {signIn.noAccount}{" "}
            <InlineLink href={accountHref("crear", locale, returnTo)}>
              {signIn.noAccountLink}
            </InlineLink>
          </p>
          <p className="mt-md">
            <InlineLink href={localizedHref("/cuenta/recuperar", locale)}>
              {signIn.forgot}
            </InlineLink>
          </p>
        </>
      }
    >
      <SignInForm
        copy={signIn}
        errors={errors}
        fields={fields}
        locale={locale}
        notice={aviso}
        providers={providers}
        returnTo={returnTo ?? null}
        social={social}
      />
    </AuthShell>
  );
}

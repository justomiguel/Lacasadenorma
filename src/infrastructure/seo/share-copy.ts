import { getContent } from "@/content";
import { excerpt } from "@/src/domain/rich-text";
import { fill } from "@/src/i18n/fill";
import { isLocale, stripLocalePrefix, type Locale } from "@/src/i18n/locale";

/**
 * El texto de la tarjeta que se ve al pegar un enlace en Facebook o WhatsApp.
 *
 * Sale del mismo paquete que `pageMetadata` / `rootMetadata`: título y
 * descripción de **esa** página. Una ruta que no está en la lista no se pinta
 * con el texto de la query: vuelve a la home. Así una URL
 * `/compartir/tarjeta?ruta=/phishing` no convierte nuestro dominio en la
 * previa de un ataque (ADR-036).
 */

export const SHARE_CARD_PATH = "/compartir/tarjeta";
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

const NEWS_SLUG = /^\/novedades\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CANONICAL_PATH = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export interface ShareCopy {
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly footer: string;
  readonly alt: string;
}

export interface PublishedUpdateCopy {
  readonly title: string;
  readonly body: string;
}

export function parseShareRuta(raw: string): string {
  let value = raw.trim();

  if (value === "") {
    return "/";
  }

  try {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
      value = new URL(value).pathname;
    }
  } catch {
    return "/";
  }

  const pathOnly = value.split(/[?#]/u, 1)[0] ?? "/";
  value = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  value = stripLocalePrefix(value);

  if (value.length > 1) {
    value = value.replace(/\/+$/u, "") || "/";
  }

  if (value !== "/" && !CANONICAL_PATH.test(value)) {
    return "/";
  }

  return value;
}

export function parseShareLocale(raw: string | null): Locale {
  return raw !== null && isLocale(raw) ? raw : "es";
}

function pageCopy(locale: Locale, title: string, description: string): ShareCopy {
  const { site, ui } = getContent(locale);

  return {
    kicker: site.name,
    title,
    description,
    footer: ui.ogCardFooter,
    alt: `${title} — ${site.name}`,
  };
}

function homeCopy(locale: Locale): ShareCopy {
  const { site, ui } = getContent(locale);

  return {
    kicker: `${site.place.locality}, ${site.place.province}`,
    title: site.name,
    description: site.shortDescription,
    footer: ui.ogCardFooter,
    alt: `${site.name} — ${site.tagline}`,
  };
}

function pages(locale: Locale): Record<string, ShareCopy> {
  const {
    account,
    catalog,
    help,
    legal,
    legacy,
    norma,
    reconstruction,
    transparency,
    ui,
    wall,
    whatHappened,
  } = getContent(locale);
  const page = (title: string, description: string) =>
    pageCopy(locale, title, description);

  return {
    "/": homeCopy(locale),
    "/norma": page(
      fill(ui.normaPage.title, { name: norma.fullName }),
      ui.normaPage.seoDescription,
    ),
    "/que-paso": page(whatHappened.title, ui.whatHappenedPage.seoDescription),
    "/reconstruccion": page(reconstruction.title, ui.reconstructionPage.seoDescription),
    "/catalogo": page(catalog.title, catalog.seoDescription),
    "/quienes-ayudaron": page(wall.title, wall.seoDescription),
    "/ayudar": page(help.title, ui.helpPage.seoDescription),
    "/ayudar/paypal/completada": page(
      ui.paypalReturn.completed.title,
      ui.paypalReturn.completed.seoDescription,
    ),
    "/ayudar/paypal/cancelada": page(
      ui.paypalReturn.cancelled.title,
      ui.paypalReturn.cancelled.seoDescription,
    ),
    "/contacto": page(ui.contactPage.title, ui.contactPage.seoDescription),
    "/transparencia": page(transparency.title, ui.transparencyPage.seoDescription),
    "/novedades": page(ui.news.title, ui.news.seoDescription),
    "/legado": page(legacy.title, ui.legacyPage.seoDescription),
    "/legales/privacidad": page(legal.privacy.title, ui.legalPage.privacySeo),
    "/legales/terminos": page(legal.terms.title, ui.legalPage.termsSeo),
    "/cuenta": page(account.profile.title, account.profile.seoDescription),
    "/cuenta/crear": page(account.signUp.title, account.signUp.seoDescription),
    "/cuenta/ingresar": page(account.signIn.title, account.signIn.seoDescription),
    "/cuenta/recuperar": page(account.recover.title, account.recover.seoDescription),
    "/cuenta/clave": page(account.password.title, account.password.seoDescription),
  };
}

export function shareCopy(path: string, locale: Locale): ShareCopy {
  const canonical = parseShareRuta(path);
  const listed = pages(locale)[canonical];

  if (listed !== undefined) {
    return listed;
  }

  if (NEWS_SLUG.test(canonical)) {
    return pages(locale)["/novedades"] ?? homeCopy(locale);
  }

  return homeCopy(locale);
}

export function shareCopyForUpdate(
  update: PublishedUpdateCopy,
  locale: Locale,
): ShareCopy {
  return pageCopy(locale, update.title, excerpt(update.body));
}

export async function resolveShareCopy(
  path: string,
  locale: Locale,
  findPublished?: (slug: string) => Promise<PublishedUpdateCopy | null>,
): Promise<ShareCopy> {
  const canonical = parseShareRuta(path);
  const match = NEWS_SLUG.exec(canonical);
  const slug = match?.[1];

  if (slug !== undefined && findPublished !== undefined) {
    const update = await findPublished(slug);

    if (update !== null) {
      return shareCopyForUpdate(update, locale);
    }
  }

  return shareCopy(canonical, locale);
}

export function shareCardUrl(canonicalPath: string, locale: Locale): string {
  const params = new URLSearchParams({
    ruta: parseShareRuta(canonicalPath),
    lang: locale,
  });

  return `${SHARE_CARD_PATH}?${params.toString()}`;
}

/** Recorte visual de la tarjeta. El `og:description` sigue siendo el texto entero. */
export function truncateForCard(text: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/u, "")}…`;
}

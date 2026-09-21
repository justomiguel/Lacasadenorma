export const INVENTED_EMAIL_DOMAIN = "lacasadenorma.com";

export function localPartFromName(name: string): string {
  const folded = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);

  return folded.length === 0 ? "alguien" : folded;
}

export function inventedEmail(
  name: string,
  taken: ReadonlySet<string> = new Set(),
): string {
  const local = localPartFromName(name);
  let candidate = `${local}@${INVENTED_EMAIL_DOMAIN}`;
  let n = 2;

  while (taken.has(candidate)) {
    candidate = `${local}-${String(n)}@${INVENTED_EMAIL_DOMAIN}`;
    n += 1;
  }

  return candidate;
}

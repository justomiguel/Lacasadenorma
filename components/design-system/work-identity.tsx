"use client";

import Image from "next/image";
import Link from "next/link";

import { useChromeSession } from "@/components/site/session";

const GENERIC_PORTRAIT = "/ui/retrato-vacio.svg";
const AVATAR = 128;

/**
 * Quién está adentro: retrato circular grande, nombre y correo.
 *
 * Reemplaza el membrete «La Casa de Norma — Tu cuenta» en el menú de
 * trabajo. El círculo acá es el retrato de quien opera, no el chrome
 * público (ADR-032). Sin foto propia, la silueta genérica: no se inventa
 * una cara.
 */
export function WorkIdentity({
  href,
  emptyName,
}: {
  href: string;
  emptyName: string;
}) {
  const { session, portraitSrc } = useChromeSession();
  const signedIn = session.status === "signed-in";
  const name = signedIn ? (session.displayName ?? emptyName) : emptyName;
  const email = signedIn ? session.email : null;
  const src = portraitSrc ?? GENERIC_PORTRAIT;

  return (
    <Link href={href} className="flex w-full flex-col items-center gap-md text-center">
      <span className="relative block size-avatar shrink-0 overflow-hidden rounded-full bg-sage">
        <Image
          src={src}
          alt={name}
          width={AVATAR}
          height={AVATAR}
          unoptimized
          className="size-avatar object-cover object-top"
        />
      </span>
      <span className="w-full min-w-0">
        <span className="block truncate font-ui text-body font-medium text-ink">{name}</span>
        {email === null ? null : (
          <span className="mt-3xs block break-all px-identity-gutter font-ui text-small text-ink-muted">
            {email}
          </span>
        )}
      </span>
    </Link>
  );
}

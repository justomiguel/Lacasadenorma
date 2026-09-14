import Link from "next/link";

import { SiteMark } from "@/components/site/mark";
import { getContent } from "@/content";

import { LoginForm } from "./login-form";

/**
 * Acceso al backoffice.
 *
 * No usa el marco de `(panel)` porque todavía no hay sesión. Conserva el papel
 * y la tipografía del sitio, y el círculo 01 ORIGINAL identifica la puerta.
 * El nombre no se repite en versales: lo dice el encabezado.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const volver = params["volver"];
  const next = typeof volver === "string" ? volver : null;
  const { site } = getContent("es");

  return (
    <div className="mx-auto max-w-measure px-md py-3xl sm:px-lg">
      <Link href="/" aria-label={site.name} className="inline-flex">
        <SiteMark size="2xl" />
      </Link>
      <h1 className="mt-2xl font-display text-title text-ink">Entrar al backoffice</h1>
      <p className="mt-sm font-ui text-small text-ink-muted">
        Esta parte del sitio es para quienes mantienen la campaña al día. Si buscabas cómo
        colaborar, está en{" "}
        <Link href="/ayudar" className="text-forest underline underline-offset-2">
          ayudar a reconstruir
        </Link>
        .
      </p>

      <div className="mt-2xl">
        <LoginForm next={next} />
      </div>

      <p className="mt-2xl font-ui text-small text-ink-muted">
        Si perdiste el acceso, la contraseña se restablece desde el panel de Supabase.
        Está explicado en el runbook del proyecto.
      </p>
    </div>
  );
}

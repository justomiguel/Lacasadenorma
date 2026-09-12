import Link from "next/link";

import { LoginForm } from "./login-form";

/**
 * Acceso al backoffice.
 *
 * No usa el marco de `(panel)` porque todavía no hay sesión, y no usa el encabezado
 * del sitio público porque no es una página del sitio: es una puerta. Lo único que
 * conserva del sitio es la tipografía y el papel, para que quien llega sepa que está
 * en el lugar correcto.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const volver = params["volver"];
  const next = typeof volver === "string" ? volver : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-measure flex-col justify-center px-md py-3xl sm:px-lg">
      <p className="font-ui text-label uppercase tracking-label text-ink-muted">
        Casa de Norma
      </p>
      <h1 className="mt-xs font-prose text-title text-ink">Entrar al backoffice</h1>
      <p className="mt-sm font-ui text-small text-ink-muted">
        Esta parte del sitio es para quienes mantienen la campaña al día. Si buscabas cómo
        colaborar, está en{" "}
        <Link href="/ayudar" className="text-brick underline underline-offset-2">
          ayudar a reconstruir
        </Link>
        .
      </p>

      <div className="mt-2xl">
        <LoginForm next={next} />
      </div>

      <p className="mt-2xl font-ui text-small text-ink-faint">
        Si perdiste el acceso, la contraseña se restablece desde el panel de Supabase.
        Está explicado en el runbook del proyecto.
      </p>
    </div>
  );
}

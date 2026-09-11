import { signOut } from "../login/actions";

/**
 * Cerrar sesión es un formulario, no un enlace.
 *
 * Un enlace `GET` que cierra sesión se puede disparar desde una imagen en otro sitio,
 * y aunque el daño sea menor —quedarse afuera— es el mismo error de forma que hace que
 * una operación con efecto viaje en un método sin efecto. Con un `POST`, Next agrega
 * su propia protección de origen a la acción.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex min-h-touch items-center font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-ink"
      >
        Cerrar sesión
      </button>
    </form>
  );
}

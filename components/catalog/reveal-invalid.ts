/**
 * Primer campo inválido: scroll, foco y borde danger (FR-216, ADR-046).
 *
 * El evento `invalid` no burbujea: se captura en el form. El navegador
 * enfoca el primero, pero no lo trae al centro si quedó abajo del pliegue.
 * Un segundo `invalid` del mismo envío se ignora. El borde rojo lo pone
 * `:user-invalid` y, si el error vino del servidor, `aria-invalid`.
 */

const FLAG = "invalidRevealed";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function revealInvalidField(field: EventTarget | null): void {
  if (!(field instanceof HTMLElement)) {
    return;
  }

  field.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    field.focus({ preventScroll: true });
  }
}

export function captureFirstInvalid(event: {
  readonly target: EventTarget | null;
}): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const form = target.closest("form");

  if (form === null) {
    revealInvalidField(target);
    return;
  }

  if (form.dataset[FLAG] === "true") {
    return;
  }

  form.dataset[FLAG] = "true";
  revealInvalidField(target);

  queueMicrotask(() => {
    delete form.dataset[FLAG];
  });
}

export function revealFormError(form: HTMLFormElement | null): void {
  revealInvalidField(form?.querySelector("[aria-invalid=true]") ?? null);
}

import { revalidatePath } from "next/cache";

/**
 * Las páginas públicas que muestran el muro o el catálogo.
 *
 * Confirmar una llegada y cambiar el anonimato tienen que verse acá sin esperar
 * el próximo despliegue (FR-229, SC-212). Vive en un solo lugar para que las
 * acciones del backoffice y las de `/cuenta` no se desfasen.
 */
export function revalidateDonationPages(): void {
  revalidatePath("/catalogo", "layout");
  revalidatePath("/en/catalogo", "layout");
  revalidatePath("/ayudar");
  revalidatePath("/en/ayudar");
  revalidatePath("/quienes-ayudaron");
  revalidatePath("/en/quienes-ayudaron");
  revalidatePath("/cuenta");
  revalidatePath("/en/cuenta");
}

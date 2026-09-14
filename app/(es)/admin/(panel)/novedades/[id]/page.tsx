import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextField,
} from "@/components/admin/form";
import { NewsBodyField } from "@/components/admin/news-body-field";
import { AdminHeading, Panel } from "@/components/admin/shell";
import { getAdminContext } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import {
  saveUpdateAction,
  setUpdatePublishedAction,
  uploadUpdateMediaAction,
} from "../actions";

/**
 * Una novedad: editarla, intercalarle fotos y videos, publicarla.
 *
 * El texto ya está escrito —viene de la pantalla anterior—. Arriba va el editor,
 * donde se intercalan los medios. Publicar está al final, después de haber visto
 * todo. `alt` es obligatorio al insertar un medio: FR-024, el caso de uso y la base.
 */
export default async function AdminNovedadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("contenido.escribir");

  const { id } = await params;
  const context = await getAdminContext();

  if (context === null || context.campaign === null) {
    notFound();
  }

  const update = await context.gateway.updates.findUpdate(id);

  if (update === null) {
    notFound();
  }

  return (
    <>
      <AdminHeading title={update.title}>
        {update.publishedAt === null
          ? "Es un borrador: todavía no está en el sitio."
          : `Publicada el ${update.publishedAt.slice(0, 10)}. Está visible en el sitio.`}
      </AdminHeading>

      <Panel id="texto" title="Texto">
        <ActionForm action={saveUpdateAction}>
          <HiddenValue name="campaignId" value={context.campaign.id} />
          <HiddenValue name="id" value={update.id} />
          <TextField
            name="title"
            label="Título"
            required
            maxLength={140}
            defaultValue={update.title}
          />
          <TextField
            name="slug"
            label="Dirección web"
            required
            defaultValue={update.slug}
            hint={
              update.publishedAt === null
                ? "Todavía se puede cambiar sin romper nada."
                : "Cambiarla rompe los enlaces que ya se compartieron."
            }
          />
          <NewsBodyField
            name="body"
            label="Texto"
            required
            defaultValue={update.body}
            allowMedia
            updateId={update.id}
            slug={update.slug}
            media={update.media}
            uploadMedia={uploadUpdateMediaAction}
            hint="Foto y video se intercalan acá. Cada uno pide qué se ve antes de subir. Epígrafe y crédito son opcionales. Un medio ya adjunto se vuelve a poner en el texto sin subirlo otra vez."
          />
          <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel
        id="publicar"
        title={update.publishedAt === null ? "Publicar" : "Estado"}
        description={
          update.publishedAt === null
            ? "Una vez publicada queda con su fecha y se puede compartir."
            : "Despublicar la saca del sitio, pero no de donde ya se compartió."
        }
      >
        <div className="flex flex-wrap items-center gap-lg">
          <ActionForm action={setUpdatePublishedAction} className="space-y-0">
            <HiddenValue name="id" value={update.id} />
            <HiddenValue name="slug" value={update.slug} />
            <HiddenValue
              name="publish"
              value={update.publishedAt === null ? "si" : "no"}
            />
            <SubmitButton
              tone={update.publishedAt === null ? "primary" : "quiet"}
              pendingLabel="Un momento…"
            >
              {update.publishedAt === null ? "Publicar ahora" : "Despublicar"}
            </SubmitButton>
          </ActionForm>

          <Link
            href="/admin/novedades"
            className="font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
          >
            Volver a la lista
          </Link>
        </div>
      </Panel>
    </>
  );
}

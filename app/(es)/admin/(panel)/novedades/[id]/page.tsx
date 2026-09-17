import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextField,
} from "@/components/admin/form";
import { NewsBodyField } from "@/components/admin/news-body-field";
import { NewsMediaInsertProvider } from "@/components/admin/news-media-context";
import { NewsMediaPanel } from "@/components/admin/news-media-panel";
import { AdminColumns, AdminHeading, Panel } from "@/components/admin/shell";
import { getAdminContext } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import {
  saveUpdateAction,
  setUpdatePublishedAction,
  uploadUpdateMediaAction,
} from "../actions";

/**
 * Una novedad: editarla, adjuntarle fotos y videos, publicarla.
 *
 * El orden es el del trabajo real: el texto ya está escrito —viene de la
 * pantalla anterior— así que primero está lo que falta, que es el archivo.
 * Foto y video se eligen acá, a la vista, no escondidos en la barra de
 * formato. Publicar queda al final, después de haber visto todo.
 *
 * `alt` es obligatorio al adjuntar: FR-024, el caso de uso y la base.
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

      <NewsMediaInsertProvider>
        <AdminColumns>
          <Panel
            id="medios"
            title="Fotos y videos"
            tone="sunk"
            description="Elegí el archivo, decí qué se ve, y se intercala donde está el cursor. Epígrafe y crédito son opcionales. Un medio ya adjunto se vuelve a poner en el texto sin subirlo otra vez."
          >
            <NewsMediaPanel
              updateId={update.id}
              slug={update.slug}
              media={update.media}
              upload={uploadUpdateMediaAction}
            />
          </Panel>

          <div>
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
                  media={update.media}
                  hint="Se ve como va a quedar. Las fotos y los videos se adjuntan en la columna de al lado."
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
          </div>
        </AdminColumns>
      </NewsMediaInsertProvider>
    </>
  );
}

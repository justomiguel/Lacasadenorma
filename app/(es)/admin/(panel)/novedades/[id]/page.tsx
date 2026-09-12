import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActionForm,
  FileField,
  HiddenValue,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { AdminColumns, AdminHeading, Panel } from "@/components/admin/shell";
import { ALLOWED_IMAGE_TYPES } from "@/src/infrastructure/files/image";
import { getAdminContext } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { addPhotoAction, saveUpdateAction, setUpdatePublishedAction } from "../actions";

/**
 * Una novedad: editarla, agregarle fotos, publicarla.
 *
 * El orden de la pantalla es el orden del trabajo real: el texto ya está escrito
 * —viene de la pantalla anterior— así que arriba a la derecha está lo que falta, que
 * es la foto. Publicar está al final, después de haber visto todo.
 *
 * `alt` es obligatorio en el formulario de la foto, y no hay ninguna forma de subir
 * una sin él: FR-024 lo pide, el caso de uso lo valida y la base lo exige con un
 * `check` que además rechaza que la descripción sea el nombre del archivo.
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

      <AdminColumns>
        <div>
          <Panel
            id="fotos"
            title="Fotos"
            tone="sunk"
            description="Cada foto necesita una descripción de lo que se ve. Sin eso no se puede publicar."
          >
            <ActionForm action={addPhotoAction} resetOnSuccess>
              <HiddenValue name="updateId" value={update.id} />
              <HiddenValue name="slug" value={update.slug} />
              <FileField
                name="file"
                label="Foto"
                required
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                hint="JPEG, PNG o WebP, hasta 8 MB."
              />
              <TextField
                name="alt"
                label="Qué se ve"
                required
                maxLength={300}
                placeholder="Cabriadas de madera apoyadas sobre los muros"
                hint="Es lo que escucha quien no puede ver la foto. No repitas el título."
              />
              <TextField name="caption" label="Epígrafe" maxLength={300} />
              <TextField name="credit" label="Quién la sacó" maxLength={120} />
              <TextField name="takenOn" label="Cuándo" type="date" />
              <SubmitButton pendingLabel="Subiendo…">Agregar foto</SubmitButton>
            </ActionForm>

            {update.media.length === 0 ? (
              <p className="mt-lg font-ui text-small text-ink-muted">
                Todavía no tiene fotos. Una novedad sin foto se publica igual, pero una
                foto de obra cuenta más que tres párrafos.
              </p>
            ) : (
              <ul className="mt-lg space-y-md">
                {update.media.map((photo) => (
                  <li key={photo.id} className="flex gap-sm">
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      width={96}
                      height={72}
                      className="h-auto w-4xl rounded-sm object-cover"
                    />
                    <p className="font-ui text-small text-ink-muted">{photo.alt}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

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
              <TextAreaField
                name="body"
                label="Texto"
                required
                rows={14}
                defaultValue={update.body}
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
    </>
  );
}

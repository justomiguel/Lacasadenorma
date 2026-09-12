import Link from "next/link";

import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { saveUpdateAction, setUpdatePublishedAction } from "./actions";

/**
 * Novedades.
 *
 * El formulario de escritura va **arriba** de la lista, y no al revés: quien entra a
 * esta pantalla casi siempre viene a escribir algo, no a mirar lo que ya escribió.
 * Guardar deja el borrador y lleva a su pantalla, donde se le agregan las fotos y se
 * publica. Son dos pasos y no uno porque publicar tiene que ser un acto deliberado:
 * una novedad publicada se comparte por WhatsApp y ya no se puede despublicar de la
 * memoria de nadie.
 */
export default async function AdminNovedadesPage() {
  await requirePermission("contenido.escribir");

  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Novedades">
      Cada avance publicado tiene su propia dirección y se puede compartir.
    </AdminHeading>
  );

  if (scope.state !== "lista") {
    return (
      <>
        {heading}
        <SinDatos state={scope.state} />
      </>
    );
  }

  const { gateway, campaign } = scope;
  const updates = await gateway.updates.listUpdates(campaign.id);

  return (
    <>
      {heading}

      <Panel
        id="nueva"
        title="Escribir una novedad"
        tone="sunk"
        description="Se guarda como borrador. Las fotos y la publicación son el paso siguiente."
      >
        <ActionForm action={saveUpdateAction}>
          <HiddenValue name="campaignId" value={campaign.id} />
          <TextField
            name="title"
            label="Título"
            required
            maxLength={140}
            placeholder="Empezó el techo"
          />
          <TextField
            name="slug"
            label="Dirección web"
            required
            hint="Va a quedar como /novedades/lo-que-escribas. Minúsculas, números y guiones."
            placeholder="empezo-el-techo"
          />
          <TextAreaField
            name="body"
            label="Texto"
            required
            rows={10}
            hint="Se acepta **negrita**, _cursiva_, listas con guiones, > para citar y ### para un subtítulo. No se acepta HTML."
          />
          <SubmitButton pendingLabel="Guardando…">Guardar borrador</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="lista" title="Lo que ya está escrito">
        {updates.length === 0 ? (
          <NoRecords>
            Todavía no hay ninguna novedad. La primera puede ser el día que empezó la
            obra.
          </NoRecords>
        ) : (
          <RecordList>
            {updates.map((update) => (
              <Record
                key={update.id}
                title={
                  <Link
                    href={`/admin/novedades/${update.id}`}
                    className="underline decoration-rule decoration-1 underline-offset-4 hover:decoration-brick"
                  >
                    {update.title}
                  </Link>
                }
                meta={`/novedades/${update.slug}`}
                status={
                  update.publishedAt === null
                    ? "Borrador"
                    : `Publicada el ${update.publishedAt.slice(0, 10)}`
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
                      {update.publishedAt === null ? "Publicar" : "Despublicar"}
                    </SubmitButton>
                  </ActionForm>

                  <Link
                    href={`/admin/novedades/${update.id}`}
                    className="font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
                  >
                    Editar y fotos
                    {update.media.length === 0 ? "" : ` (${String(update.media.length)})`}
                  </Link>

                  {update.publishedAt === null ? null : (
                    <Link
                      href={`/novedades/${update.slug}`}
                      className="font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
                    >
                      Ver en el sitio
                    </Link>
                  )}
                </div>
              </Record>
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

import type { MediaAsset, UpdateRecord } from "@/src/domain/entities";
import type { AdminUpdatePort } from "@/src/domain/ports/admin";

import { inspectImage, storageKeyFor, UnsupportedFileError } from "../../files/image";
import { mapMedia, type MediaRow } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { MEDIA_COLUMNS, PHOTO_BUCKET, UPDATE_COLUMNS } from "./columns";
import { QueryError } from "./query";

interface UpdateRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  published_at: string | null;
  update_media: { sort_order: number; media: MediaRow | null }[];
}

export function createUpdatesPort(client: ServerSupabaseClient): AdminUpdatePort {
  const publicUrlFor = (storagePath: string): string =>
    client.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  function mapUpdate(row: UpdateRow): UpdateRecord {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      body: row.body,
      publishedAt: row.published_at,
      media: [...row.update_media]
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((link) =>
          link.media === null ? [] : [mapMedia(link.media, publicUrlFor)],
        ),
    };
  }

  return {
    async listUpdates(campaignId): Promise<UpdateRecord[]> {
      const { data, error } = await client
        .from("updates")
        .select(UPDATE_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer las novedades", error);
      }

      return data.map(mapUpdate);
    },

    async findUpdate(id): Promise<UpdateRecord | null> {
      const { data, error } = await client
        .from("updates")
        .select(UPDATE_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("leer la novedad", error);
      }

      return data === null ? null : mapUpdate(data);
    },

    async saveUpdate(input): Promise<string> {
      const row = {
        campaign_id: input.campaignId,
        slug: input.slug,
        title: input.title,
        body: input.body,
      };

      const { data, error } =
        input.id === null
          ? await client.from("updates").insert(row).select("id").single()
          : await client
              .from("updates")
              .update(row)
              .eq("id", input.id)
              .select("id")
              .single();

      if (error !== null) {
        throw new QueryError("guardar la novedad", error);
      }

      return data.id;
    },

    async setUpdatePublished({ id, publishedAt }): Promise<void> {
      const { error } = await client
        .from("updates")
        .update({ published_at: publishedAt })
        .eq("id", id);

      if (error !== null) {
        throw new QueryError("publicar la novedad", error);
      }
    },

    /**
     * El orden importa: primero se valida el archivo por contenido, después se
     * sube, y sólo entonces se crea la fila. Si la fila se creara primero, un
     * fallo de subida dejaría una foto registrada que no existe, y la galería
     * mostraría un hueco roto.
     */
    async createMedia(input): Promise<MediaAsset> {
      const info = await inspectImage(input.file);
      const key = storageKeyFor(info.mimeType);

      const { error: uploadError } = await client.storage
        .from(PHOTO_BUCKET)
        .upload(key, input.file, {
          contentType: info.mimeType,
          // Sin `upsert`: la clave la genera el servidor y es única, así que un
          // upsert sólo podría pisar el archivo de otra persona.
          upsert: false,
        });

      if (uploadError !== null) {
        throw new UnsupportedFileError(
          `No pudimos subir la foto: ${uploadError.message}`,
        );
      }

      const { data, error } = await client
        .from("media")
        .insert({
          storage_path: key,
          alt_text: input.alt,
          caption: input.caption,
          credit: input.credit,
          width: info.width,
          height: info.height,
          taken_on: input.takenOn,
        })
        .select(MEDIA_COLUMNS)
        .single();

      if (error !== null) {
        throw new QueryError("registrar la foto", error);
      }

      return mapMedia(data, publicUrlFor);
    },

    async attachMediaToUpdate({ updateId, mediaId, sortOrder }): Promise<void> {
      const { error } = await client
        .from("update_media")
        .upsert(
          { update_id: updateId, media_id: mediaId, sort_order: sortOrder },
          { onConflict: "update_id,media_id" },
        );

      if (error !== null) {
        throw new QueryError("asociar la foto a la novedad", error);
      }
    },
  };
}

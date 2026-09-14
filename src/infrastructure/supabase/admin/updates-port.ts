import type { MediaAsset, UpdateRecord } from "@/src/domain/entities";
import type { AdminUpdatePort } from "@/src/domain/ports/admin";

import { inspectImage, storageKeyFor, UnsupportedFileError } from "../../files/image";
import { inspectUpload } from "../../files/inspect-upload";
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

interface StoredPoster {
  readonly key: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
}

async function uploadObject(
  client: ServerSupabaseClient,
  bucketId: string,
  key: string,
  file: File,
  contentType: string,
): Promise<void> {
  const { error } = await client.storage.from(bucketId).upload(key, file, {
    contentType,
    upsert: false,
  });

  if (error !== null) {
    throw new UnsupportedFileError(`No pudimos subir el archivo: ${error.message}`);
  }
}

async function dropObject(
  client: ServerSupabaseClient,
  bucketId: string,
  key: string,
): Promise<void> {
  const { error } = await client.storage.from(bucketId).remove([key]);

  if (error !== null) {
    console.error(
      `No se pudo borrar ${bucketId}/${key} después de un alta fallida.`,
      error,
    );
  }
}

async function inspectPoster(file: File): Promise<StoredPoster> {
  const info = await inspectImage(file);

  return {
    key: storageKeyFor(info.mimeType),
    mimeType: info.mimeType,
    width: info.width,
    height: info.height,
  };
}

export function createUpdatesPort(client: ServerSupabaseClient): AdminUpdatePort {
  const publicUrlFor = (bucketId: string, storagePath: string): string =>
    client.storage.from(bucketId).getPublicUrl(storagePath).data.publicUrl;

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
     * El orden importa: primero se valida por contenido (el video y, si viene,
     * el JPEG del fotograma 10), después se sube, y sólo entonces se crea la
     * fila. Si la fila se creara primero, un fallo de subida dejaría un medio
     * registrado que no existe.
     */
    async createMedia(input): Promise<MediaAsset> {
      const placed = await inspectUpload(input.file);
      const poster =
        placed.kind === "video" && input.poster instanceof File
          ? await inspectPoster(input.poster)
          : null;

      await uploadObject(
        client,
        placed.bucketId,
        placed.key,
        input.file,
        placed.mimeType,
      );

      if (poster !== null && input.poster instanceof File) {
        try {
          await uploadObject(
            client,
            PHOTO_BUCKET,
            poster.key,
            input.poster,
            poster.mimeType,
          );
        } catch (error) {
          await dropObject(client, placed.bucketId, placed.key);
          throw error;
        }
      }

      const { data, error } = await client
        .from("media")
        .insert({
          kind: placed.kind,
          bucket_id: placed.bucketId,
          storage_path: placed.key,
          alt_text: input.alt,
          caption: input.caption,
          credit: input.credit,
          width: placed.width,
          height: placed.height,
          taken_on: input.takenOn,
          poster_path: poster?.key ?? null,
          poster_width: poster?.width ?? null,
          poster_height: poster?.height ?? null,
        })
        .select(MEDIA_COLUMNS)
        .single();

      if (error !== null) {
        await dropObject(client, placed.bucketId, placed.key);

        if (poster !== null) {
          await dropObject(client, PHOTO_BUCKET, poster.key);
        }

        throw new QueryError("registrar el archivo", error);
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

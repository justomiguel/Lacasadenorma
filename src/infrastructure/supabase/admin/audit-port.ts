import { roleRank, type AppRole } from "@/src/domain/entities/role";
import type { AdminRolePort, AuditEntry, AuditPort } from "@/src/domain/ports/admin";

import type { Json } from "../database.types";
import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

export function createAuditPort(client: ServerSupabaseClient): AuditPort {
  return {
    /**
     * Se llama a `record_audit` y no se inserta en la tabla.
     *
     * Ningún rol tiene privilegio de `insert` sobre `audit_log`: la función es la
     * única vía de escritura, y adentro comprueba que quien llama tenga alguno de
     * los cuatro roles internos (ADR-019). Escribir con la sesión de quien actúa era
     * lo que hacía que un `editor` no pudiera publicar una novedad y un `auditor` no
     * pudiera abrir un comprobante: la policy pedía `admin` y ellos no lo son.
     *
     * `actor_id` y `occurred_at` no son parámetros. Los fija el trigger
     * `audit_log_stamp_entry` desde el token y el reloj del servidor, y que la
     * función no los acepte es la razón por la que no se pueden falsificar
     * (migración 20260909120800, amenaza R1).
     */
    async append(input): Promise<void> {
      const { error } = await client.rpc("record_audit", {
        p_action: input.action,
        p_entity_table: input.entityTable,
        // Los dos casts son del generador de tipos, no del esquema. Supabase declara
        // todo argumento de función como no nulo, y estos dos aceptan `null`: el
        // `uuid` cuando la entrada no habla de una fila concreta, y el `jsonb` cuando
        // no hay nada que detallar. El `diff` además es un objeto de valores
        // desconocidos del lado del puerto y una columna `jsonb` del lado de la base;
        // lo que se guarda son textos y booleanos que armó la capa de aplicación.
        p_entity_id: input.entityId as string,
        p_diff: input.diff as Json,
      });

      if (error !== null) {
        throw new QueryError("registrar en la auditoría", error);
      }
    },

    async list(limit): Promise<AuditEntry[]> {
      const { data, error } = await client
        .from("audit_log")
        .select("id, actor_id, action, entity_table, entity_id, diff, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (error !== null) {
        throw new QueryError("leer la auditoría", error);
      }

      return data.map((row) => ({
        id: String(row.id),
        actorId: row.actor_id,
        action: row.action,
        entityTable: row.entity_table,
        entityId: row.entity_id,
        diff:
          typeof row.diff === "object" && row.diff !== null && !Array.isArray(row.diff)
            ? (row.diff as Record<string, unknown>)
            : null,
        occurredAt: row.occurred_at,
      }));
    },
  };
}

export function createRolesPort(client: ServerSupabaseClient): AdminRolePort {
  return {
    /**
     * Un rol por persona: el de mayor rango, igual que resuelve el hook del token.
     * Una persona puede tener varias filas y lo que importa es con qué permisos
     * actuó, que es siempre el más alto.
     *
     * Devuelve una lista vacía para un `auditor`: la policy de `user_roles` pide
     * `admin`, así que no es un error sino la respuesta correcta para ese rol.
     */
    async listRoles(): Promise<readonly { userId: string; role: AppRole }[]> {
      const { data, error } = await client.from("user_roles").select("user_id, role");

      if (error !== null) {
        throw new QueryError("leer los roles", error);
      }

      const highest = new Map<string, AppRole>();

      for (const row of data) {
        const current = highest.get(row.user_id);

        if (current === undefined || roleRank(row.role) > roleRank(current)) {
          highest.set(row.user_id, row.role);
        }
      }

      return [...highest].map(([userId, role]) => ({ userId, role }));
    },
  };
}

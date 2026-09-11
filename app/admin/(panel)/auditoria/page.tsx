import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { NoRecords, Record, RecordList } from "@/components/admin/records";
import {
  APP_ROLE_LABELS,
  describeAuditAction,
  describeAuditEntity,
} from "@/src/domain/entities";
import type { AppRole } from "@/src/domain/entities/role";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

/**
 * El registro de auditoría.
 *
 * Es la pantalla que contesta "¿quién cambió esto?" cuando una cifra no cuadra, y la
 * única del backoffice que no tiene un solo formulario: el registro sólo se agrega, no
 * se corrige ni se borra, ni para `owner`. La base lo garantiza por ausencia de policy
 * de `UPDATE` y de `DELETE` (amenaza T2), no por disciplina de esta pantalla.
 *
 * **Por qué se muestra el rol y no el correo.** El registro guarda el identificador de
 * quien hizo cada cambio. Traducirlo a un correo obligaría a exponer la tabla de
 * usuarios de Supabase, que hoy no lee nadie del backoffice, y pondría los correos del
 * equipo a la vista de un rol de auditoría que puede ser externo a la familia. El rol
 * alcanza para lo que la pantalla contesta, y "vos" se distingue del resto porque la
 * sesión ya lo sabe.
 *
 * Un `auditor` ve el registro completo y no puede resolver los actores, porque leer los
 * roles pide `admin`. Es deliberado: su trabajo es verificar los números, y para eso el
 * qué y el cuándo alcanzan.
 */
export default async function AdminAuditoriaPage() {
  const viewer = await requirePermission("auditoria.leer");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Auditoría">
      Todo cambio en plata o en cuentas deja una fila acá. Ninguna se puede editar ni
      borrar.
    </AdminHeading>
  );

  if (scope.state === "sin-base") {
    return (
      <>
        {heading}
        <SinDatos state="sin-base" />
      </>
    );
  }

  const { gateway } = scope;

  // Cien filas: es lo que se recorre buscando un movimiento reciente. Un registro
  // completo se consulta contra la base, no desde una pantalla.
  const entries = await gateway.audit.list(100);
  const roles = await gateway.roles.listRoles();

  const roleOf = new Map<string, AppRole>(
    roles.map((entry) => [entry.userId, entry.role]),
  );

  function describeActor(actorId: string | null): string {
    if (actorId === null) {
      return "El sistema";
    }

    if (actorId === viewer.userId) {
      return "Vos";
    }

    const role = roleOf.get(actorId);

    return role === undefined ? "Otra persona del equipo" : APP_ROLE_LABELS[role];
  }

  return (
    <>
      {heading}

      <Callout title="Qué muestra este registro">
        <p>
          Cada fila dice quién, qué y cuándo. Se muestra el rol de quien hizo el cambio y
          no su correo: para verificar un movimiento el rol alcanza, y un correo es un
          dato personal que no hace falta poner a circular.
        </p>
      </Callout>

      <Panel id="registro" title="Los últimos cien movimientos">
        {entries.length === 0 ? (
          <NoRecords>
            Todavía no hay ningún movimiento registrado. La primera fila va a aparecer con
            el primer aporte o gasto que se cargue.
          </NoRecords>
        ) : (
          <RecordList>
            {entries.map((entry) => (
              <Record
                key={entry.id}
                title={`${describeActor(entry.actorId)} ${describeAuditAction(entry.action)}`}
                meta={`${describeAuditEntity(entry.entityTable)} · ${formatMoment(entry.occurredAt)}`}
              >
                {entry.diff === null ? null : <Diff diff={entry.diff} />}
              </Record>
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

/**
 * El momento, en hora argentina y con los segundos.
 *
 * Los segundos importan acá y en ningún otro lugar del sitio: dos gastos cargados en la
 * misma sesión se distinguen por ellos, y "¿en qué orden pasó esto?" es justamente la
 * pregunta que trae a alguien a esta pantalla.
 */
function formatMoment(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  })
    .format(new Date(iso))
    .replace(/\u00a0/g, " ");
}

/**
 * Lo que cambió, como lista de definición.
 *
 * El `diff` lo arma cada caso de uso y ya viene sin datos sensibles: de una cuenta
 * bancaria guarda qué campos se tocaron, nunca los valores. Acá se muestra tal cual, y
 * los valores se pasan por `String` porque son montos y booleanos ya formateados por la
 * capa de aplicación.
 */
function Diff({ diff }: { diff: Readonly<Record<string, unknown>> }) {
  const entries = Object.entries(diff);

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-x-lg gap-y-2xs sm:grid-cols-[auto_1fr]">
      {entries.map(([key, value]) => (
        <div key={key} className="sm:col-span-2 sm:grid sm:grid-cols-subgrid">
          <dt className="font-ui text-small text-ink-muted">{key}</dt>
          <dd className="font-ui text-small text-ink">{describeValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function describeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "sin dato";
  }

  if (typeof value === "boolean") {
    return value ? "sí" : "no";
  }

  if (Array.isArray(value)) {
    return value.map((item) => describeValue(item)).join(", ");
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  // Un objeto anidado. Ningún caso de uso arma un `diff` así hoy, y si alguno lo
  // hiciera, esto muestra el JSON en lugar de "[object Object]": la fila sigue
  // diciendo qué cambió.
  return JSON.stringify(value);
}

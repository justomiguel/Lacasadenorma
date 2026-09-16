import { AdminHeading, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { MetricsBoard } from "@/components/admin/metrics-board";
import { getOwnerMetrics } from "@/src/application/admin/metrics";
import { getAdminDeps, getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

/**
 * El pulso de la campaña: libro, gráficos y excepciones.
 *
 * Sólo `owner`. El snapshot no trae correos ni nombres (ADR-047).
 */
export default async function AdminMetricasPage() {
  await requirePermission("metricas.leer");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Métricas">
      Todo lo que se puede medir de la campaña y del sitio, con gráficos y las señales que
      piden una decisión. Los montos viven sólo acá. Afuera se hablan en porcentajes.
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

  const deps = await getAdminDeps();

  if (deps === null) {
    return (
      <>
        {heading}
        <SinDatos state="sin-base" />
      </>
    );
  }

  const result = await getOwnerMetrics(deps);

  if (result.status === "rejected") {
    return (
      <>
        {heading}
        <Callout tone="danger" title="Sin permiso">
          <p>{result.message}</p>
        </Callout>
      </>
    );
  }

  if (result.status === "unavailable") {
    return (
      <>
        {heading}
        <Callout tone="danger" title="No se pudo leer el tablero">
          <p>
            {result.reason === "not-published"
              ? "Todavía no hay una campaña a la que imputar las cifras."
              : "La lectura falló. El detalle quedó en el registro del servidor. No se muestran ceros en su lugar."}
          </p>
        </Callout>
      </>
    );
  }

  return (
    <>
      {heading}
      <MetricsBoard metrics={result.data} />
    </>
  );
}

import {
  ActionForm,
  defaultOf,
  GroupError,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { COUNTRY_NAMES, type PaymentMethodAdminRecord } from "@/src/domain/entities";
import { CURRENCIES } from "@/src/domain/money";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { savePaymentMethodAction, setPaymentMethodPublishedAction } from "./actions";
import { COUNTRY_PRESETS, type AccountFieldPreset } from "./presets";

/**
 * Cuentas de aporte.
 *
 * La pantalla de mayor consecuencia del sistema, y la única reservada a `owner`: quien
 * cambia un CBU desvía todos los aportes de la campaña. Tres cosas están así por eso:
 *
 * 1. **Guardar y publicar son dos operaciones.** Una cuenta guardada no aparece en el
 *    sitio hasta que alguien la publica mirando los datos ya cargados. Es la defensa
 *    contra el error de tipeo que nadie revisó (ADR-006).
 * 2. **Los campos vienen con el nombre puesto.** Se carga el CBU en el campo que dice
 *    CBU, no en "etiqueta 2". Un dato bancario en el renglón equivocado es el error que
 *    este proyecto no puede cometer.
 * 3. **Se avisa cuando no hay ninguna cuenta publicada**, porque en ese estado la
 *    página de aportes no muestra ninguna forma de colaborar, y eso no se nota desde
 *    acá.
 */
export default async function AdminCuentasPage() {
  await requirePermission("cuentas.escribir");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Cuentas">
      Los datos que se publican para transferir. Se guardan primero y se publican después,
      a propósito.
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
  const methods = await gateway.paymentMethods.listMethods(campaign.id);
  const publicadas = methods.filter((method) => method.publishedAt !== null);

  const nextOrder =
    methods.length === 0
      ? 10
      : Math.max(...methods.map((method) => method.sortOrder)) + 10;

  /**
   * Un renglón de dato. La etiqueta y la copiabilidad viajan en `hidden` porque son
   * propiedades del dato y no decisiones de quien carga la cuenta; el valor es lo
   * único que se escribe.
   */
  function fieldRow(preset: AccountFieldPreset, value: string | null) {
    return (
      <div key={preset.label}>
        <HiddenValue name="fieldLabel" value={preset.label} />
        <HiddenValue name="fieldCopyable" value={preset.copyable ? "on" : ""} />
        <HiddenValue name="fieldHint" value={preset.hint ?? ""} />
        <TextField
          name="fieldValue"
          label={preset.label}
          {...(preset.hint === null ? {} : { hint: preset.hint })}
          {...(preset.numeric === true ? { inputMode: "numeric" as const } : {})}
          maxLength={120}
          {...defaultOf(value)}
        />
      </div>
    );
  }

  return (
    <>
      {heading}

      {publicadas.length === 0 ? (
        <Callout tone="warning" title="No hay ninguna cuenta publicada">
          <p>
            Mientras esto sea así, la página de aportes explica cómo colaborar y no
            muestra ningún dato bancario. Es correcto si todavía no verificaste los datos,
            y es un problema si ya los tenés.
          </p>
        </Callout>
      ) : null}

      {COUNTRY_PRESETS.map((preset) => {
        const existente =
          methods.find((method) => method.countryCode === preset.countryCode) ?? null;

        return (
          <Panel
            key={preset.countryCode}
            id={`cuenta-${preset.countryCode}`}
            title={COUNTRY_NAMES[preset.countryCode]}
            tone="sunk"
            description={
              existente === null
                ? "Todavía no hay una cuenta cargada para este país."
                : existente.publishedAt === null
                  ? "Cargada y sin publicar: no aparece en el sitio."
                  : "Publicada: es una de las cuentas que el sitio muestra."
            }
          >
            <ActionForm action={savePaymentMethodAction}>
              <HiddenValue name="campaignId" value={campaign.id} />
              {existente === null ? null : <HiddenValue name="id" value={existente.id} />}
              <HiddenValue name="countryCode" value={preset.countryCode} />

              <div className="grid gap-lg sm:grid-cols-2">
                <TextField
                  name="label"
                  label="Cómo se llama en el sitio"
                  required
                  maxLength={120}
                  defaultValue={existente?.label ?? preset.label}
                />
                <SelectField
                  name="currency"
                  label="Moneda"
                  required
                  options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                  defaultValue={existente?.currency ?? preset.currency}
                />
              </div>

              <GroupError name="fields" />

              <div className="space-y-lg">
                {preset.fields.map((fieldPreset) =>
                  fieldRow(
                    fieldPreset,
                    existente?.fields.find((field) => field.label === fieldPreset.label)
                      ?.value ?? null,
                  ),
                )}
              </div>

              <TextAreaField
                name="instructions"
                label="Qué aclarar a quien transfiere"
                rows={3}
                maxLength={500}
                defaultValue={existente?.instructions ?? preset.instructions}
              />

              <TextField
                name="sortOrder"
                label="Orden en la página"
                inputMode="numeric"
                defaultValue={String(existente?.sortOrder ?? nextOrder)}
              />

              <SubmitButton pendingLabel="Guardando…">
                {existente === null ? "Guardar cuenta" : "Guardar cambios"}
              </SubmitButton>
            </ActionForm>
          </Panel>
        );
      })}

      <Panel id="publicacion" title="Qué está publicado">
        {methods.length === 0 ? (
          <NoRecords>
            Todavía no hay ninguna cuenta cargada. Cargá una arriba y publicala cuando
            hayas verificado los datos contra el homebanking.
          </NoRecords>
        ) : (
          <RecordList>
            {methods.map((method) => (
              <PublishRow key={method.id} method={method} />
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

/**
 * Una cuenta con su interruptor de publicación.
 *
 * Muestra los valores completos a propósito: publicar sin ver lo que se publica es
 * exactamente el paso que esta pantalla intenta evitar. Sólo `owner` llega hasta acá.
 */
function PublishRow({ method }: { method: PaymentMethodAdminRecord }) {
  const publicada = method.publishedAt !== null;

  return (
    <Record
      title={`${COUNTRY_NAMES[method.countryCode]} · ${method.label}`}
      meta={method.currency}
      status={publicada ? "Publicada" : "Sin publicar"}
    >
      <dl className="mb-md grid gap-x-lg gap-y-2xs sm:grid-cols-[auto_1fr]">
        {method.fields.map((field) => (
          <div key={field.label} className="sm:col-span-2 sm:grid sm:grid-cols-subgrid">
            <dt className="font-ui text-small text-ink-muted">{field.label}</dt>
            <dd className="font-ui text-small text-ink">{field.value}</dd>
          </div>
        ))}
      </dl>

      <RowAction
        label={publicada ? "Dejar de publicarla" : "Publicarla en el sitio"}
        tone={publicada ? "danger" : "quiet"}
      >
        <ActionForm action={setPaymentMethodPublishedAction}>
          <HiddenValue name="id" value={method.id} />
          <HiddenValue name="publish" value={publicada ? "no" : "si"} />
          <p className="max-w-measure font-ui text-small text-ink-muted">
            {publicada
              ? "Va a desaparecer de la página de aportes. Quien ya haya copiado los datos los sigue teniendo."
              : "Comparalos con tu homebanking antes de seguir. Publicada, esta cuenta es la que va a recibir las transferencias."}
          </p>
          <SubmitButton
            tone={publicada ? "danger" : "primary"}
            pendingLabel="Un momento…"
          >
            {publicada ? "Dejar de publicarla" : "Sí, publicarla"}
          </SubmitButton>
        </ActionForm>
      </RowAction>
    </Record>
  );
}

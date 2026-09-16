import { defaultOf } from "@/components/admin/defaults";
import {
  CheckboxField,
  FileField,
  HiddenValue,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import type { DonationItemAdminRecord } from "@/src/domain/entities";
import { amountToInputValue } from "@/src/domain/money-input";
import { ALLOWED_IMAGE_TYPES } from "@/src/infrastructure/files/image";

type Options = readonly { value: string; label: string }[];

/**
 * Los campos de un ítem del catálogo, alta o edición.
 *
 * El valor estimado es opcional: vacío no se inventa un cero. La foto lleva
 * `alt` obligatorio cuando se sube. Bajar la cantidad por debajo de lo
 * comprometido lo rechaza la base.
 */
export function CatalogItemFields({
  item,
  campaignId,
  goalCurrency,
  nextOrder,
  unitOptions,
  categoryOptions,
  currencyOptions,
  budgetOptions,
}: {
  item: DonationItemAdminRecord | null;
  campaignId: string;
  goalCurrency: string;
  nextOrder: number;
  unitOptions: Options;
  categoryOptions: Options;
  currencyOptions: Options;
  budgetOptions: Options;
}) {
  const committed = item === null ? 0 : item.reservedQuantity + item.fulfilledQuantity;

  return (
    <>
      <HiddenValue name="campaignId" value={campaignId} />
      {item === null ? null : <HiddenValue name="id" value={item.id} />}
      {item?.photoMediaId === null || item === null ? null : (
        <HiddenValue name="photoMediaId" value={item.photoMediaId} />
      )}
      <TextField
        name="title"
        label="Qué hace falta"
        required
        maxLength={140}
        placeholder="Chapas del techo"
        {...defaultOf(item?.title)}
      />
      <TextAreaField
        name="description"
        label="Qué sirve y qué no"
        rows={3}
        maxLength={500}
        hint="Medida, material, calidad. Aparece debajo del título."
        {...defaultOf(item?.description)}
      />
      <div className="grid gap-lg sm:grid-cols-2">
        <SelectField
          name="category"
          label="Categoría"
          required
          options={categoryOptions}
          defaultValue={item?.category ?? "materiales"}
        />
        <SelectField
          name="unit"
          label="Unidad"
          required
          options={unitOptions}
          defaultValue={item?.unit ?? "unidad"}
        />
      </div>
      <div className="grid gap-lg sm:grid-cols-2">
        <TextField
          name="neededQuantity"
          label="Cuántas hacen falta"
          required
          inputMode="numeric"
          hint={
            committed === 0
              ? "Un entero. No se puede bajar por debajo de lo ya comprometido."
              : `Hay ${String(committed)} comprometidas. No se puede pedir menos.`
          }
          defaultValue={String(item?.neededQuantity ?? 1)}
        />
      </div>
      <SelectField
        name="budgetItemId"
        label="Rubro del presupuesto"
        options={budgetOptions}
        defaultValue={item?.budgetItemId ?? ""}
        hint="Opcional. Para que el catálogo y el presupuesto hablen de la misma obra."
      />
      <div className="grid gap-lg sm:grid-cols-2">
        <TextField
          name="amount"
          label="Valor estimado por unidad"
          inputMode="decimal"
          hint="Etiquetado como estimado en el sitio. Vacío si no hay cifra."
          {...defaultOf(
            item?.estimatedValue === null || item?.estimatedValue === undefined
              ? null
              : amountToInputValue(item.estimatedValue),
          )}
        />
        <SelectField
          name="currency"
          label="Moneda"
          required
          options={currencyOptions}
          defaultValue={item?.estimatedValue?.currency ?? goalCurrency}
        />
      </div>
      <FileField
        name="file"
        label="Foto"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        hint="JPEG, PNG o WebP. Si no subís una, la ficha pública muestra la foto de referencia del tipo, etiquetada. Esta pisa esa."
      />
      <TextField
        name="alt"
        label="Qué se ve en la foto"
        maxLength={300}
        hint="Obligatorio si subís una foto. Describe lo que se ve, no el archivo."
      />
      <TextField
        name="sortOrder"
        label="Orden"
        inputMode="numeric"
        hint="De menor a mayor. Primero lo que más falta."
        defaultValue={String(item?.sortOrder ?? nextOrder)}
      />
      <CheckboxField
        name="publish"
        label="Mostrarlo en el sitio"
        defaultChecked={item === null ? true : item.publishedAt !== null}
        hint="Sin marcar queda guardado y no aparece en /catalogo."
      />
    </>
  );
}

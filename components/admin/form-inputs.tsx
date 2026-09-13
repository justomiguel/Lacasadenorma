"use client";

import { cn } from "@/components/design-system/cn";

import { CONTROL, FieldFrame, useField, type FieldProps } from "./form-field";

export function TextField({
  name,
  label,
  hint,
  required,
  className,
  type = "text",
  defaultValue,
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: FieldProps & {
  type?: "text" | "date" | "email" | "password" | "url";
  defaultValue?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email";
  autoComplete?: string;
  maxLength?: number;
}) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <input
        id={field.id}
        name={name}
        type={type}
        className={CONTROL}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(inputMode === undefined ? {} : { inputMode })}
        {...(autoComplete === undefined ? {} : { autoComplete })}
        {...(maxLength === undefined ? {} : { maxLength })}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  required,
  className,
  defaultValue,
  rows = 8,
  maxLength,
}: FieldProps & { defaultValue?: string; rows?: number; maxLength?: number }) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <textarea
        id={field.id}
        name={name}
        rows={rows}
        className={cn(CONTROL, "font-prose leading-relaxed")}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(maxLength === undefined ? {} : { maxLength })}
      />
    </FieldFrame>
  );
}

export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  options,
  defaultValue,
}: FieldProps & {
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <select
        id={field.id}
        name={name}
        className={CONTROL}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(defaultValue === undefined ? {} : { defaultValue })}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function FileField({
  name,
  label,
  hint,
  required,
  className,
  accept,
}: FieldProps & { accept?: string }) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <input
        id={field.id}
        name={name}
        type="file"
        className="block w-full font-ui text-small text-ink file:mr-sm file:min-h-touch file:rounded-sm file:border file:border-rule file:bg-paper-sunk file:px-sm file:py-xs file:font-ui file:text-small"
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(accept === undefined ? {} : { accept })}
      />
    </FieldFrame>
  );
}

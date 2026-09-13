import { z } from "zod";

import { paragraphs, phrase } from "./primitives";

/**
 * El texto de las pantallas de cuenta, en los dos idiomas (ADR-023).
 *
 * Está en `content/` y no incrustado en los componentes por la razón que obligó a
 * que los códigos de error existan: `/cuenta/*` vive en castellano y en inglés, y
 * `/admin/*` no. El backoffice puede escribir "Entrar" en el JSX; esto no.
 *
 * Los formularios son componentes de cliente y `content/index.ts` es
 * `server-only`, así que el texto **baja por props** desde la página, que es un
 * Server Component. No es una molestia: es lo que evita que Zod y diez JSON viajen
 * al navegador (ADR-022).
 */

const screen = z.object({
  title: phrase,
  lead: phrase,
  seoDescription: phrase,
  submit: phrase,
  /** El rótulo mientras la acción corre. Un botón sin estado parece colgado. */
  submitting: phrase,
});

/**
 * Un mensaje por cada código de `ACCOUNT_ERROR_CODES`.
 *
 * Las claves se escriben literales y no derivadas de la lista de códigos: hacerlas
 * derivadas obligaría a que `content/` importe de `src/application/`, que es la
 * dirección equivocada de la dependencia. Lo que impide que se separen es
 * `content/schema.test.ts`, que compara las dos listas y falla si alguna tiene algo
 * que la otra no.
 */
const errors = z.object({
  notConfigured: phrase,
  noSession: phrase,
  emailInvalid: phrase,
  passwordShort: phrase,
  passwordMismatch: phrase,
  credentials: phrase,
  rateLimited: phrase,
  displayNameRequired: phrase,
  noRecoverySession: phrase,
  linkExpired: phrase,
  internalRole: phrase,
  failed: phrase,
});

export const accountSchema = z.object({
  fields: z.object({
    email: phrase,
    password: phrase,
    passwordHint: phrase,
    newPassword: phrase,
    confirmPassword: phrase,
    displayName: phrase,
    displayNameHint: phrase,
    anonymous: phrase,
    anonymousHint: phrase,
    language: phrase,
    languageEs: phrase,
    languageEn: phrase,
  }),

  signUp: screen.extend({
    privacyLead: phrase,
    privacyLink: phrase,
    privacyTail: phrase,
    haveAccount: phrase,
    haveAccountLink: phrase,
    /** Registrarse no abre sesión: hay que confirmar el correo primero. */
    checkInboxTitle: phrase,
    checkInboxBody: paragraphs,
  }),

  signIn: screen.extend({
    noAccount: phrase,
    noAccountLink: phrase,
    forgot: phrase,
  }),

  recover: screen.extend({
    /** Se muestra **exista o no** la cuenta: el formulario no es un oráculo. */
    sentTitle: phrase,
    sentBody: paragraphs,
    back: phrase,
  }),

  password: screen.extend({
    noSessionTitle: phrase,
    noSessionBody: paragraphs,
    request: phrase,
  }),

  profile: z.object({
    title: phrase,
    lead: phrase,
    seoDescription: phrase,
    signedInAs: phrase,
    appearanceHeading: phrase,
    appearanceLead: phrase,
    appearsAs: phrase,
    appearsAnonymous: phrase,
    save: phrase,
    saving: phrase,
    saved: phrase,
    signOut: phrase,
    signingOut: phrase,
    deleteHeading: phrase,
    deleteLead: phrase,
    /** La palabra que hay que escribir. Se traduce: en inglés no es "BORRAR". */
    deleteWord: phrase,
    deleteConfirmLabel: phrase,
    delete: phrase,
    deleting: phrase,
    unavailableTitle: phrase,
    unavailableBody: phrase,
  }),

  errors,
});

export type AccountContent = z.infer<typeof accountSchema>;

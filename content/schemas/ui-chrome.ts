import { z } from "zod";

import { phrase } from "./primitives";

const navItemSchema = z.object({
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  summary: z.string().min(1),
});

const namedLinkSchema = z.object({
  label: z.string().min(1),
});

/**
 * Chrome de la interfaz: no es editorial, y por eso no vive en los JSON de
 * cada página. El encabezado, el pie, el sumario y los botones de copiar y
 * compartir lo leen de acá. Un componente de cliente **no** importa este
 * archivo: lo recibe por props o por el `UiProvider` del layout (ADR-023).
 */
export const uiChromeSchema = z.object({
  skipToContent: phrase,
  helpCta: phrase,
  helpShort: phrase,
  copy: phrase,
  copied: phrase,
  copiedAnnouncement: phrase,
  copyFailed: phrase,
  share: phrase,
  copyLink: phrase,
  linkCopied: phrase,
  linkCopiedLive: phrase,
  languageName: phrase,
  otherLanguageName: phrase,
  countryTabsLabel: phrase,
  homeLabel: phrase,
  legalLabel: phrase,
  publishedOn: phrase,
  lastUpdated: phrase,
  footerNote: phrase,
  ogCardFooter: phrase,
  nav: z.object({
    primary: phrase,
    index: phrase,
    footer: phrase,
    project: phrase,
    campaign: phrase,
    next: phrase,
    legal: phrase,
  }),
  primaryNav: z.object({
    "/que-paso": navItemSchema,
    "/ayudar": navItemSchema,
    "/norma": navItemSchema,
    "/legado": navItemSchema,
    "/contacto": navItemSchema,
  }),
  secondaryNav: z.object({
    "/novedades": namedLinkSchema,
    "/reconstruccion": namedLinkSchema,
  }),
  legalNav: z.object({
    "/legales/privacidad": namedLinkSchema,
    "/legales/terminos": namedLinkSchema,
  }),
  countries: z.object({
    AR: phrase,
    CL: phrase,
    US: phrase,
  }),
  expenseCategories: z.object({
    materiales: phrase,
    mano_de_obra: phrase,
    servicios: phrase,
    transporte: phrase,
    herramientas: phrase,
    otros: phrase,
  }),
  figures: z.object({
    received: phrase,
    receivedIn: phrase,
    spent: phrase,
    balance: phrase,
    executedNote: phrase,
    otherCurrency: phrase,
    unquoted: phrase,
    noGoal: phrase,
    raisedOfGoal: phrase,
    ofGoal: phrase,
    percentOfGoal: phrase,
  }),
  progress: z.object({
    noReconciliation: phrase,
    reconciledOn: phrase,
    otherCurrencies: phrase,
    milestones: phrase,
    staleTitle: phrase,
    staleBody: phrase,
  }),
  budget: z.object({
    emptyTitle: phrase,
    emptyBody: phrase,
    noneQuoted: phrase,
    someQuoted: phrase,
  }),
  ledger: z.object({
    date: phrase,
    concept: phrase,
    category: phrase,
    receipt: phrase,
    amount: phrase,
    yes: phrase,
    receiptYes: phrase,
    receiptMissing: phrase,
    caption: phrase,
  }),
  donations: z.object({
    emptyTitle: phrase,
    emptyBody: phrase,
  }),
  unavailable: z.object({
    errorTitle: phrase,
    emptyTitle: phrase,
    notConfigured: phrase,
    error: phrase,
    notPublished: phrase,
  }),
});

import { getCampaignStatus } from "./campaign-status";
import { getDonationMethodsCapability } from "./donation-methods";
import { getNormaStoryCapability } from "./norma-story";
import { getReconstructionProgressCapability } from "./reconstruction-progress";
import { getTransparencySummary } from "./transparency-summary";
import { defineCapability } from "./types";
import type { CapabilityDescriptor } from "./types";

/**
 * Las cinco capacidades del contrato, todas de sólo lectura.
 *
 * Cada una llama **el mismo caso de uso que usa la página**. No hay una consulta
 * paralela para agentes: la especificación de WebMCP nombra explícitamente la
 * divergencia entre el camino de la interfaz y el del agente como vulnerabilidad
 * (amenaza A5), y la única defensa real es que exista un solo camino.
 *
 * El orden es el del contrato, y hay un test que lo verifica.
 */
export const capabilityDescriptors: readonly CapabilityDescriptor[] = [
  defineCapability(getCampaignStatus),
  defineCapability(getDonationMethodsCapability),
  defineCapability(getReconstructionProgressCapability),
  defineCapability(getNormaStoryCapability),
  defineCapability(getTransparencySummary),
];

import { capabilityDescriptors } from "./capabilities";
import type { CapabilityContext, CapabilityDescriptor, CapabilityResult } from "./types";

export { CAPABILITY_LIMITS } from "./types";
export type { CapabilityContext, CapabilityDescriptor, CapabilityResult } from "./types";

/**
 * El `AgentCapabilityService`: un registro y una forma de invocarlo.
 *
 * Cuatro adaptadores lo consumen —la interfaz, el endpoint REST, WebMCP y un
 * futuro servidor MCP— y ninguno agrega lógica. Las tres diferencias entre
 * WebMCP y MCP (cómo se registra, el formato del esquema y la forma del retorno)
 * viven en el adaptador; la lógica y la autorización viven acá, una sola vez.
 */

export const capabilities: readonly CapabilityDescriptor[] = capabilityDescriptors;

export function findCapability(name: string): CapabilityDescriptor | undefined {
  return capabilities.find((capability) => capability.name === name);
}

export async function runCapability(
  name: string,
  rawInput: unknown,
  context: CapabilityContext,
): Promise<CapabilityResult<unknown>> {
  const capability = findCapability(name);

  if (capability === undefined) {
    return {
      ok: false,
      code: "not_found",
      message: `No existe una capacidad llamada "${name}". Las disponibles son: ${capabilities
        .map((item) => item.name)
        .join(", ")}.`,
    };
  }

  return capability.run(rawInput, context);
}

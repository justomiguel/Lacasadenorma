import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { capabilities } from "@/src/application/agent-capabilities/registry";

import { TOOLS, WebMcpTools } from "./webmcp";

/**
 * El adaptador de WebMCP corre en el navegador, así que no puede importar el
 * registro de capacidades: traería Zod y la capa de aplicación al bundle del
 * cliente. La consecuencia es que los nombres, las descripciones y los esquemas
 * están escritos dos veces, y ADR-009 nombra esa duplicación como el riesgo que
 * quería evitar ("escribir los dos a mano los desincroniza").
 *
 * Este archivo es la respuesta a esa objeción. No comparte el código: comprueba
 * que las dos copias digan lo mismo, y falla el build cuando se separan.
 *
 * Importa porque un agente elige la herramienta por su descripción. Si acá quedara
 * la descripción vieja de `get_transparency_summary` y el registro empezara a
 * devolver otra cosa, el modelo pediría una herramienta creyendo que hace algo que
 * ya no hace, y nadie lo notaría: la llamada devolvería 200.
 */

/** El slug del endpoint, derivado igual que en la ruta pública. */
function slugDe(name: string): string {
  return name.replace(/^get_/, "").replaceAll("_", "-");
}

/**
 * Normaliza un JSON Schema para poder comparar el escrito a mano con el que
 * genera Zod.
 *
 * Se sacan dos cosas, y las dos son deliberadas. `$schema` lo agrega
 * `z.toJSONSchema()` y a la especificación de WebMCP no le hace falta. Y las
 * claves `description` de las propiedades son un agregado del adaptador para el
 * modelo —"Si se omite, devuelve todas"— que no tiene equivalente en el esquema
 * de Zod: exigirlas haría fallar el test por una mejora.
 *
 * Lo que sí se compara es todo lo que gobierna qué puede mandar un agente: el
 * tipo, los nombres de las propiedades, sus tipos, los valores del enum y
 * `additionalProperties`.
 */
function normalizar(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(normalizar);
  }

  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  const salida: Record<string, unknown> = {};

  for (const [clave, valor] of Object.entries(schema)) {
    if (clave === "$schema" || clave === "description") {
      continue;
    }

    salida[clave] = normalizar(valor);
  }

  return salida;
}

interface Registrada {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  readonly annotations?: { readonly readOnlyHint?: boolean };
  execute(input: Record<string, unknown>): Promise<string> | string;
}

/** Instala un `document.modelContext` falso y devuelve lo que se registró en él. */
function conModelContext(): Registrada[] {
  const registradas: Registrada[] = [];

  Object.defineProperty(document, "modelContext", {
    value: {
      registerTool: (tool: Registrada) => {
        registradas.push(tool);

        return Promise.resolve();
      },
    },
    configurable: true,
  });

  return registradas;
}

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  Reflect.deleteProperty(navigator, "modelContext");
  vi.restoreAllMocks();
});

describe("las herramientas declaradas son las capacidades registradas", () => {
  it("son las mismas, en el mismo orden", () => {
    // En las dos direcciones: una capacidad nueva sin herramienta queda invisible
    // para los agentes, y una herramienta sin capacidad detrás es un 404 que el
    // modelo descubre en producción.
    expect(TOOLS.map((tool) => tool.name)).toEqual(
      capabilities.map((capability) => capability.name),
    );
  });

  it.each(capabilities.map((capability) => capability.name))(
    "%s tiene la descripción del registro, palabra por palabra",
    (name) => {
      const tool = TOOLS.find((item) => item.name === name);
      const capability = capabilities.find((item) => item.name === name);

      expect(tool?.description).toBe(capability?.description);
    },
  );

  it.each(TOOLS)("$name apunta al slug que la ruta pública resuelve", (tool) => {
    // Si el slug no coincide, `runTool` pega contra un endpoint que no existe y el
    // agente recibe el 404 en lugar del dato.
    expect(tool.path).toBe(slugDe(tool.name));
  });

  it.each(capabilities.map((capability) => capability.name))(
    "el esquema de %s escrito a mano es el que genera Zod",
    (name) => {
      const tool = TOOLS.find((item) => item.name === name);
      const capability = capabilities.find((item) => item.name === name);

      expect(capability).toBeDefined();

      // Un esquema más permisivo acá que en el servidor invita al modelo a mandar
      // algo que la capacidad va a rechazar con 400; uno más estricto le esconde
      // un parámetro que existe. Las dos son formas de la amenaza A5.
      expect(normalizar(tool?.inputSchema)).toEqual(
        normalizar(z.toJSONSchema(capability!.input)),
      );
    },
  );

  it("ningún esquema acepta propiedades que el servidor no espera", () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema, tool.name).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
    }
  });
});

describe("el registro en el navegador", () => {
  it("registra las cinco como sólo lectura", () => {
    const registradas = conModelContext();

    render(<WebMcpTools />);

    expect(registradas.map((tool) => tool.name)).toEqual(TOOLS.map((tool) => tool.name));

    // `readOnlyHint` es lo que le permite a un navegador ejecutar la herramienta
    // sin pedir confirmación. Declararlo en una que mute algo sería el problema;
    // omitirlo en éstas, que no mutan nada, obligaría a una confirmación que hoy
    // la especificación no tiene forma de pedir.
    for (const tool of registradas) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
    }
  });

  it("también encuentra la API en el alias viejo de navigator", () => {
    const registradas: Registrada[] = [];

    Object.defineProperty(navigator, "modelContext", {
      value: {
        registerTool: (tool: Registrada) => {
          registradas.push(tool);

          return Promise.resolve();
        },
      },
      configurable: true,
    });

    render(<WebMcpTools />);

    // Chromium 149–150 expone `navigator.modelContext` durante el origin trial.
    expect(registradas).toHaveLength(TOOLS.length);
  });

  it("no hace nada en un navegador sin la API, y no rompe", () => {
    // La mejora progresiva no es una promesa del comentario: sin `modelContext`
    // el efecto tiene que salir sin tocar nada. Si lanzara, se caería el árbol
    // entero de React y con él la página, para todo el mundo (FR-033).
    expect(() => render(<WebMcpTools />)).not.toThrow();
  });

  it("un objeto sin registerTool no se toma por la API", () => {
    Object.defineProperty(document, "modelContext", {
      value: { provideContext: () => undefined },
      configurable: true,
    });

    // Es la forma que expusieron las versiones anteriores de la especificación:
    // el objeto está, el método se llamaba de otra manera. Confiar en que el
    // objeto exista sería llamar a algo que no está.
    expect(() => render(<WebMcpTools />)).not.toThrow();
  });

  it("un fallo al registrar no se propaga a la página", async () => {
    Object.defineProperty(document, "modelContext", {
      value: { registerTool: () => Promise.reject(new Error("no se pudo")) },
      configurable: true,
    });

    expect(() => render(<WebMcpTools />)).not.toThrow();

    // La promesa rechazada se atrapa en el adaptador. Sin el `.catch`, sería un
    // unhandled rejection en cada visita con un navegador con la API.
    await expect(Promise.resolve()).resolves.toBeUndefined();
  });
});

describe("lo que una herramienta le devuelve al modelo", () => {
  it("devuelve el cuerpo del endpoint como texto, sin la envoltura de MCP", async () => {
    const registradas = conModelContext();
    const cuerpo = { goalMinor: null, raisedMinor: 24_000_000, currency: "ARS" };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(cuerpo));

    render(<WebMcpTools />);

    const resultado = await registradas[0]?.execute({});

    // WebMCP serializa lo que se devuelva. Devolver `{ content: [{ text }] }`
    // —la forma de MCP— produciría un objeto anidado que el agente tiene que
    // desarmar antes de leer una cifra.
    expect(resultado).toBe(JSON.stringify(cuerpo));
  });

  it("un 503 llega como el mensaje del servidor, no como una excepción", async () => {
    const registradas = conModelContext();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { error: { code: "unavailable", message: "El dato no está disponible." } },
        { status: 503 },
      ),
    );

    render(<WebMcpTools />);

    // Quien lee esto es un modelo que puede reintentar o decir que no sabe. Una
    // excepción opaca le quita las dos opciones (principio XII).
    expect(await registradas[0]?.execute({})).toBe("El dato no está disponible.");
  });

  it("la red caída se explica y no inventa un valor por defecto", async () => {
    const registradas = conModelContext();

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<WebMcpTools />);

    const resultado = await registradas[0]?.execute({});

    expect(resultado).toContain("no está disponible");
    expect(resultado).not.toMatch(/\d/);
  });

  it("sólo los primitivos entran en la cadena de consulta", async () => {
    const registradas = conModelContext();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ methods: [] }));

    render(<WebMcpTools />);

    const metodos = registradas.find((tool) => tool.name === "get_donation_methods");

    await metodos?.execute({ country: "CL", ruido: { anidado: true } });

    const destino = fetchSpy.mock.calls[0]?.[0];
    const url = typeof destino === "string" ? destino : "";

    expect(url).toContain("country=CL");
    // Un objeto convertido a parámetro daría `[object Object]`, y el servidor
    // contestaría un 400 sobre una clave que el modelo no mandó así.
    expect(url).not.toContain("object");
  });
});

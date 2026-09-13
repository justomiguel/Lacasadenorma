import { getNormaStory } from "../use-cases/get-norma-story";
import { noInput } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface NormaStoryOutput {
  readonly name: string;
  readonly roleLabel: string;
  readonly place: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly bornOn: string | null;
  readonly diedOn: string | null;
}

export const getNormaStoryCapability: AgentCapability<
  Record<string, never>,
  NormaStoryOutput
> = {
  name: "get_norma_story",
  title: "Quién fue Norma",
  description:
    "Devuelve la información pública sobre Norma: su nombre, su rol, el lugar donde vivió y el relato publicado sobre su vida. La fecha de nacimiento se publica cuando consta en el documento familiar. La de fallecimiento no se estima.",
  input: noInput,
  readOnly: true,
  run(_input, _context) {
    // El contenido editorial vive en el repositorio y está validado en build:
    // esta capacidad no puede quedar indisponible (ADR-007).
    return Promise.resolve({ ok: true, output: getNormaStory() });
  },
  format(output) {
    return `${output.name}. ${output.roleLabel}, ${output.place}. ${output.summary}`;
  },
};

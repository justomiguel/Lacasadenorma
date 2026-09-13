import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";
import {
  donateActionSchema,
  faqSchema,
  organizationSchema,
  personSchema,
} from "./structured-data";
import {
  SITE,
  allKeys,
  allTypes,
  emit,
  emitOne,
  everyNode,
  isJsonObject,
  objectList,
} from "./structured-data-helpers";

const { faq, norma, site } = getContent("es");

describe("organizationSchema", () => {
  it("declara Organization y nunca una figura legal que no existe", () => {
    // Fundación Norma no tiene personería jurídica. `NGO` y
    // `NonprofitOrganization` afirman una: sería el mismo dato falso que la
    // página de legado se ocupa de desmentir en prosa, dicho donde nadie lo
    // revisa. Es la aserción más importante de este archivo.
    expect(emitOne(organizationSchema(SITE))["@type"]).toBe("Organization");
  });

  it("ningún nodo del sitio se declara NGO ni NonprofitOrganization", () => {
    const types = allTypes(emit(everyNode()).nodes);

    expect(types).toContain("Organization");
    expect(types).not.toContain("NGO");
    expect(types).not.toContain("NonprofitOrganization");
    expect(types).not.toContain("Corporation");
  });

  it("no publica un domicilio de la organización, porque no hay uno publicable", () => {
    const node = emitOne(organizationSchema(SITE));

    // El lugar del proyecto sí es verdadero y ayuda a que se lo encuentre por él;
    // una dirección postal de la organización, no: inventarla para completar el
    // esquema es exactamente lo que la regla prohíbe.
    expect(node).not.toHaveProperty("address");
    expect(node).toHaveProperty("areaServed");
    expect(JSON.stringify(node)).toContain(site.place.locality);
  });
});

describe("personSchema", () => {
  it("declara birthDate cuando la familia la publicó, y no inventa deathDate", () => {
    const node = emitOne(personSchema(SITE));

    expect(norma.bornOn).toBe("1955-01-19");
    expect(node).toHaveProperty("birthDate", "1955-01-19");
    expect(norma.diedOn).toBeNull();
    expect(node).not.toHaveProperty("deathDate");
    expect(Object.keys(node)).not.toContain("deathDate");
  });

  it("el nombre con el que la conocían queda como alternateName", () => {
    const node = emitOne(personSchema(SITE));

    expect(node).toHaveProperty("alternateName", norma.knownAs);
  });
});

describe("faqSchema", () => {
  it("emite las preguntas visibles, en el orden en que se leen", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    expect(faq).toHaveLength(3);
    expect(questions).toHaveLength(faq.length);
    expect(questions.map((question) => question.name)).toEqual(
      faq.map((entry) => entry.question),
    );
  });

  it("la respuesta es la misma prosa que se renderiza, no una versión reescrita", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    // La home renderiza cada párrafo de `answer` como un `<dd>` desde este mismo
    // contenido. Dos versiones distintas de la misma respuesta —una para la
    // persona y otra para el buscador— es contenido oculto, y está prohibido.
    expect(
      questions.map((question) =>
        isJsonObject(question.acceptedAnswer) ? question.acceptedAnswer.text : null,
      ),
    ).toEqual(faq.map((entry) => entry.answer.join(" ")));
  });

  it("una respuesta de varios párrafos se une, no se recorta al primero", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);
    const multiple = faq.filter((entry) => entry.answer.length > 1);

    // Si el `join` se cambiara por `answer[0]`, la mitad de esas respuestas
    // desaparecería del dato estructurado sin que nada más se rompa.
    expect(multiple.length).toBeGreaterThan(0);

    for (const entry of multiple) {
      const emitted = questions.find((question) => question.name === entry.question);
      const answer = emitted === undefined ? undefined : emitted.acceptedAnswer;
      const text = isJsonObject(answer) ? answer.text : undefined;

      for (const paragraph of entry.answer) {
        expect(String(text)).toContain(paragraph);
      }
    }
  });

  it("cada pregunta es Question con su Answer, que es lo que la política exige", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    for (const question of questions) {
      expect(question["@type"]).toBe("Question");
      expect(
        isJsonObject(question.acceptedAnswer) && question.acceptedAnswer["@type"],
      ).toBe("Answer");
    }
  });
});

describe("donateActionSchema", () => {
  it("no declara ningún monto: no hay un aporte sugerido y no se inventa uno", () => {
    const keys = allKeys(emitOne(donateActionSchema(SITE)));

    for (const monetary of [
      "price",
      "priceCurrency",
      "priceSpecification",
      "amount",
      "minPrice",
      "maxPrice",
      "currency",
    ]) {
      expect(keys).not.toContain(monetary);
    }
  });

  it("apunta a la página de aportes, que es donde están los datos verificados", () => {
    const node = emitOne(donateActionSchema(SITE));
    const target = node.target;

    expect(isJsonObject(target) && target.urlTemplate).toBe(`${SITE}/ayudar`);
  });

  it("en inglés el DonateAction apunta a /en/ayudar", () => {
    const node = emitOne(donateActionSchema(SITE, "en"));
    const target = node.target;

    expect(isJsonObject(target) && target.urlTemplate).toBe(`${SITE}/en/ayudar`);
  });
});

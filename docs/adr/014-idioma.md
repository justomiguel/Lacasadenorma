# ADR-014 · Castellano para producto y documentación, inglés para el código

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El proyecto es de Riacho He Hé, Formosa. Quien lo administra, quien lo lee y quien probablemente
colabore hablan castellano. Al mismo tiempo, el código, las dependencias y las convenciones del
ecosistema están en inglés, y mezclar los dos idiomas dentro de un identificador produce cosas como
`getGastosPublicados` o `expenseAnulado`, que son peores que cualquiera de las dos opciones puras.

## Decisión

Frontera clara por tipo de artefacto:

| Artefacto | Idioma |
|---|---|
| Contenido del sitio | **Castellano rioplatense**, con voseo |
| Rutas (`/reconstruccion`, `/ayudar`, `/transparencia`) | **Castellano** |
| Documentación: `README`, `/docs`, ADRs, `/specs`, constitución | **Castellano** |
| Código: identificadores, tipos, funciones, archivos | **Inglés** |
| Comentarios de código | **Castellano**, cuando explican una restricción o un por qué |
| Mensajes de commit y títulos de PR | **Inglés**, formato convencional |
| Nombres de tablas y columnas | **Inglés** |
| Valores de enums de dominio visibles en la UI (`materiales`, `en_curso`) | **Castellano**, porque son datos, no código |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Todo en inglés | La documentación es para quien administra el proyecto y para colaboradores de la comunidad. Escribirla en inglés la vuelve inaccesible justo para su audiencia |
| Todo en castellano, incluido el código | Choca con las dependencias y con toda convención del ecosistema; genera identificadores mixtos |
| Documentación bilingüe | Dos versiones que se desincronizan. Es peor que una sola, y la constitución dice que documentación desactualizada es peor que ausente |
| Rutas en inglés | El sitio es en castellano; `/help` en un sitio para vecinos de Formosa es una decisión de developer, no de producto |

## Consecuencias

**Buenas.** La documentación cumple su función: alguien de la comunidad puede leerla y participar. El
código sigue siendo legible para cualquier developer. Las URLs son coherentes con el contenido.

**Malas y aceptadas.**

- Los artefactos de Spec Kit tienen esqueletos en inglés (encabezados como `## Requirements`,
  `## Success Criteria`) y se completan en castellano. Es un híbrido visible, deliberado: cambiar los
  encabezados rompería la compatibilidad con los comandos que los leen.
- Un colaborador que no hable castellano no podrá leer las specs. Se acepta: la prioridad es la
  comunidad del proyecto, y el código con sus tipos comunica lo suficiente para contribuir.
- La internacionalización del sitio quedó fuera de alcance en v1 y se pagó después, cuando el
  sitio ya estaba en pie y había un corredor de donación en inglés que la justificaba. Ver
  [ADR-023](./023-i18n-estructural.md).

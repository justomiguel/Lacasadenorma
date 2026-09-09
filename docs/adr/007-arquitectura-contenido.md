# ADR-007 · Contenido dividido por frecuencia de cambio: repositorio y base de datos

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

FR-018 pide que el contenido humano no quede completamente hardcodeado. Pero el brief también pide
explícitamente no construir un CMS gigante. Y hay un requisito que tira en la dirección opuesta a
ambos: el sitio tiene que levantarse y verse completo sin credenciales (SC-012, FR-034).

La observación que resuelve la tensión: **no todo el contenido cambia con la misma frecuencia.** La
historia de Norma se escribe una vez y se corrige de vez en cuando. El monto recaudado cambia cada
semana.

## Decisión

Dos fuentes, divididas por frecuencia de cambio:

| Fuente | Contenido | Se edita |
|---|---|---|
| `content/*.ts` versionado en el repositorio, validado con Zod | Historia de Norma, relato del accidente, textos de secciones, preguntas frecuentes, descripción del legado y de Riacho Conecta | Con un commit y un PR |
| Supabase | Montos, aportes, gastos, comprobantes, hitos, novedades, fotos, cuentas de aporte, objetivos | Desde el backoffice |

El contenido del repositorio se valida con Zod al importarse: un campo faltante o mal formado rompe
el build, no la página en producción.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Todo en un CMS (Sanity, Contentful, Payload) | Un proveedor más que puede fallar o cobrar, un modelo de contenido que mantener, y la garantía de que el sitio **no** levanta sin credenciales |
| Todo en Supabase | Editar la historia de Norma desde un formulario es peor que editarla en un PR revisable, y perdería el historial de cambios de la prosa |
| Todo hardcodeado en los componentes | Publicar un avance requeriría un despliegue. Es exactamente lo que hace que la transparencia se desactualice |
| Archivos Markdown en el repositorio | Similar a lo elegido, pero sin validación de tipos: un campo faltante se descubriría en producción |

## Consecuencias

**Buenas.** El sitio se clona y se ve completo con `npm install && npm run dev`, sin variables de
entorno: todo el contenido narrativo está en el repositorio. Los cambios de prosa pasan por
revisión, que para textos sobre una persona fallecida es lo correcto. Los cambios operativos no
necesitan despliegue.

**Malas y aceptadas.**

- Corregir un typo en la historia requiere un PR. Aceptado: es contenido que cambia pocas veces y
  merece revisión.
- Hay dos lugares donde buscar contenido. Se mitiga con `docs/content-guide.md`, que dice campo por
  campo dónde vive cada cosa y quién lo edita.
- Si en el futuro alguien no técnico necesita editar la prosa, habrá que mover esa parte a la base.
  El límite está pensado para que ese movimiento sea aditivo: los repositorios ya existen como
  puertos.

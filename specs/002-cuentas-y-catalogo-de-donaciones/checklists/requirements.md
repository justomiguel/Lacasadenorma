# Specification Quality Checklist: Cuentas, catálogo de donaciones y muro

**Purpose**: validar que la especificación está completa antes de planificar

**Created**: 2026-09-13

**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin detalles de implementación (lenguajes, frameworks, APIs)
- [x] Centrada en valor para las personas y en la necesidad del proyecto
- [x] Escrita para que la entienda quien no programa
- [x] Todas las secciones obligatorias completas

## Requirement Completeness

- [x] No quedan marcadores `[NEEDS CLARIFICATION]` sueltos en los requisitos
- [x] Los requisitos son verificables y no ambiguos
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito no nombran tecnología
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos límite están identificados
- [x] El alcance está acotado
- [x] Dependencias y supuestos identificados

## Feature Readiness

- [x] Cada requisito funcional tiene criterio de aceptación claro
- [x] Las historias cubren los flujos principales
- [x] La feature cumple los resultados medibles declarados
- [x] Ningún detalle de implementación se filtró a la especificación

## Notas

**Sobre las tres decisiones pendientes.** No están escritas como
`[NEEDS CLARIFICATION]` dentro de los requisitos, sino aparte, en § Decisiones
pendientes, y **cada una tiene su valor recomendado ya aplicado** al resto del
documento. La diferencia importa: con un marcador en medio de un requisito, la
especificación no es implementable hasta que alguien contesta. Así, es
implementable hoy y queda registrado qué se eligió por defecto y qué costaría
cambiarlo.

Las tres son decisiones de producto de la dueña del proyecto —si la reserva se
asigna sola o la aprueba la familia, si el nombre aparece al reservar o al
recibir, y si se publica el valor estimado—, no ambigüedades de la
especificación.

**Sobre los requisitos que parecen implementación.** FR-211 ("la garantía MUST
estar en la base de datos"), FR-227 ("impuesta por privilegios de la base") y
FR-205 ("verificarse con una compuerta automática") nombran *dónde* vive una
garantía, que es más específico de lo que una especificación suele decir. Es
deliberado y viene de la constitución: en este proyecto, "una regla que sólo
vive en un documento no frena nada" es un requisito de producto, porque la
confianza en el sitio es el producto. Un requisito que dijera sólo "el sistema no
debe permitir sobreventa" se podría cumplir con un `if` y sería falso el primer
día que dos personas abran el catálogo a la vez.

**Sobre la cobertura de los criterios.** Los doce criterios de éxito se verifican
automáticamente salvo SC-201 (tres minutos para reservar, se mide a mano una vez)
y SC-212 (cinco minutos hasta el muro, garantizado por el ISR). Los otros diez
tienen prueba en `tasks.md`.

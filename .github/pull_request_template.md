# Qué hace este cambio

<!-- Dos o tres oraciones. Qué problema resuelve, no qué archivos toca. -->

**Especificación**: <!-- FR-0XX, SC-0XX, ADR-0XX o el archivo de specs/ que lo pide. Si no existe, paralo y escribilo primero (principio I). -->

## Cómo lo verificaste

<!-- Qué corriste y qué miraste. Si es una pantalla, poné capturas de 360 px y de 1440 px. -->

## Definition of Done

Marcá lo que sea verdad. Lo que no aplique, tachalo con una línea diciendo por qué; lo que quede sin
marcar es trabajo pendiente, no un olvido del formulario.

- [ ] Cumple la especificación que se cita arriba.
- [ ] Tiene tests en el nivel que corresponde, y los vi fallar antes de que pasaran.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run lint` y `npm run format:check` pasan.
- [ ] `npm run build` pasa.
- [ ] Accesibilidad revisada: axe limpio en las páginas que toqué, foco visible, navegable con
      teclado, jerarquía de encabezados sin saltos.
- [ ] Revisado en mobile de verdad (360 px), no sólo en el monitor.
- [ ] Seguridad considerada: qué rol accede a esto, qué pasa sin sesión, ningún secreto del lado
      cliente, validación también en el servidor.
- [ ] SEO considerado: metadata, título, descripción, datos estructurados que describan lo que se ve.
- [ ] Documentación actualizada en este mismo commit (README, `docs/`, ADR o spec).
- [ ] CI en verde.

## Datos y contenido

- [ ] No hay ningún dato inventado: ni montos, ni fechas, ni CBU, ni nombres de ejemplo. Lo que no
      está verificado, la interfaz lo omite en lugar de rellenarlo.

## Base de datos

<!-- Borrá esta sección si el cambio no toca supabase/. -->

- [ ] El cambio de esquema llega por una migración versionada, no a mano.
- [ ] Hay tests pgTAP de negación: qué rol **no** puede hacer qué.
- [ ] `npm run db:verify` pasa, incluidos los advisors.
- [ ] Si la migración es destructiva: está dicho acá abajo qué se pierde y cómo se vuelve atrás.

## Riesgos y vuelta atrás

<!-- Qué se rompe si esto sale mal y cuál es el camino de regreso. "Nada" también es una respuesta,
     si es cierta. -->

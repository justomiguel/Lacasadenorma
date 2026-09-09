# ADR-010 · Analítica sin cookies ni identificación personal

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Hay preguntas que importan para que la campaña funcione: cuánta gente llega, de dónde, cuántos tocan
"Ayudar", cuántos copian un dato bancario, cuántos comparten. Sin eso no se sabe si el problema es de
alcance o de conversión.

Y hay un contexto que condiciona la respuesta: el sitio habla de una persona que murió, lo visitan
sus vecinos y su familia, y su credibilidad es su único activo. Instalar los rastreadores habituales
sería incoherente con eso.

## Decisión

Eventos semánticos, sin cookies, sin identificadores persistentes, sin datos personales. Se registra
**qué pasó**, nunca **quién lo hizo**.

Eventos:

| Evento | Propiedades |
|---|---|
| `page_view` | ruta, referente (sólo el dominio), país (a nivel país) |
| `help_cta_click` | ubicación en la página |
| `payment_method_view` | país del método |
| `bank_field_copy` | país, tipo de campo (nunca el valor) |
| `share_click` | destino |
| `transparency_view` | — |
| `update_view` | slug |

La capa de analítica es un puerto (`AnalyticsPort`) con dos implementaciones: una que no hace nada
(por defecto, y en tests) y una que envía a un proveedor respetuoso de la privacidad cuando está
configurado. **Sin configuración, no se envía nada.**

`docs/privacy.md` y la página pública de privacidad documentan qué se recolecta, para qué y cuánto
se conserva.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Google Analytics 4 | Cookies, perfilado, transferencia de datos, y un banner de consentimiento que agrega fricción justo en la primera pantalla |
| Meta Pixel | Lo mismo, peor |
| Sin analítica | No se podría distinguir "nadie llega" de "llegan y no colaboran", que son problemas opuestos |
| Analítica propia sobre la base de datos | Escribir en la base en cada visita agrega latencia y un problema de escritura que no queremos en un pico de difusión |
| Guardar la dirección IP | Es dato personal. El país alcanza para todo lo que necesitamos saber |

## Consecuencias

**Buenas.** Sin banner de consentimiento, lo que significa una barrera menos en la primera pantalla y
una decisión de privacidad que se puede explicar en una línea. Los tests no necesitan mockear nada.
Si el proveedor desaparece, se cambia una implementación.

**Malas y aceptadas.**

- No hay embudos por persona ni cohortes. Se conocen totales, no recorridos individuales. Es
  suficiente para las decisiones que hay que tomar.
- No se puede atribuir un aporte a una campaña de difusión con precisión, porque el aporte ocurre en
  el banco, fuera del sitio. Se compensa con el evento de copiado como señal de intención.
- Hay que resistir la tentación de agregar "sólo un pixel". Queda como prohibición explícita en la
  constitución (principio de privacidad) y en este ADR.

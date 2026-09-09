# ADR-012 · Sistema de diseño propio sobre tokens de Tailwind 4

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El principio VIII de la constitución exige que la interfaz no parezca generada por IA ni un clon de
`shadcn/ui`. Al mismo tiempo, escribir CSS a mano para todo es lento y produce inconsistencias, y el
proyecto lo mantiene una persona.

Hay que distinguir dos cosas que se confunden: **usar Tailwind** y **verse como un sitio de
Tailwind**. Lo segundo pasa cuando se usan los valores por defecto (`rounded-lg`, `shadow-md`,
`bg-gradient-to-r`, la paleta `slate`). Lo primero es sólo un mecanismo.

## Decisión

Tailwind 4.3 con configuración **CSS-first**, con **cero valores por defecto de la paleta y de las
escalas**. Los tokens se declaran en `@theme` y son la única API de estilo:

```css
@theme {
  --color-paper: oklch(98.6% 0.006 85);
  --color-ink: oklch(22% 0.014 65);
  --color-brick: oklch(52% 0.142 38);
  --text-display: 3.25rem;
  --text-display--line-height: 1.04;
  --text-display--letter-spacing: -0.03em;
  --ease-editorial: cubic-bezier(0.2, 0.7, 0.2, 1);
}
```

En Tailwind 4 los tokens **generan las utilidades**: `--color-ink-muted` produce `text-ink-muted`,
`bg-ink-muted` y `border-ink-muted`, y además queda disponible como custom property para CSS a mano.

Las primitivas (`Prose`, `Figure`, `Stat`, `CopyField`, `Ledger`, `Timeline`, `Callout`,
`CountryTabs`) se escriben a mano, en `components/design-system/`, con test de componente y
cobertura de axe.

Decisiones que hacen la diferencia visual, tomadas de `ux.md`: radio máximo de 2 px, **ninguna
sombra** (sólo el anillo de foco), reglas de un pixel en lugar de cards, composiciones asimétricas
en lugar de todo centrado, y como máximo tres elementos con color de acento por pantalla.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `shadcn/ui` | Prohibido por la constitución: es la estética que hay que evitar, y su valor es la velocidad, no la identidad |
| Radix UI o React Aria como base | Tentador por accesibilidad. Se descartó porque los componentes interactivos de este sitio son tres (copiar, tabs de país, compartir) y hacerlos bien a mano es menos código que la dependencia. **Si aparece un componente complejo —un combobox, un date picker— se reevalúa**: reinventar eso a mano sería peor |
| CSS Modules o CSS a mano | Más control, mucho más lento, y la consistencia dependería de la disciplina |
| CSS-in-JS | Costo en runtime y en hidratación, contra el principio VII |
| Tailwind con valores por defecto | Es lo que hace que un sitio se vea como todos los demás |
| Un paquete de design system aparte | Sobrearquitectura para un solo consumidor |

## Consecuencias

**Buenas.** Identidad propia con la velocidad de las utilidades. Los tokens quedan documentados en un
solo archivo y disponibles tanto para utilidades como para CSS a mano. Cambiar el acento es una línea.

**Malas y aceptadas.**

- Hay que escribir la accesibilidad de las primitivas a mano: foco, `aria-live` en el copiado, patrón
  de tabs con flechas. Se cubre con tests de componente y axe, y es la razón de que la lista de
  primitivas sea deliberadamente corta.
- `tailwind.config.js` ya no se descubre automáticamente en Tailwind 4: si alguien crea uno esperando
  que funcione, no pasa nada. Documentado en `docs/architecture.md`.
- El sitio no tiene modo oscuro en v1. Los tokens están estructurados para soportarlo con
  `@custom-variant dark` sin refactor.

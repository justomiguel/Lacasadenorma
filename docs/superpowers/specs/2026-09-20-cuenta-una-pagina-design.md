# Tu cuenta — una página, sin pestañas

**Fecha:** 2026-09-20  
**Páginas:** `/cuenta` y `/en/cuenta`, cuando el destino es Tu cuenta.  
**No toca:** Mis donaciones, el riel, el retrato privado, las páginas públicas, ni el HTML cacheado.

## Problema

Tu cuenta son tres pestañas: Cómo aparecer, Acceso, Borrar. La foto vive adentro de la primera. Quien entra a cambiar la contraseña no ve la foto; quien sube la foto no ve que más abajo se puede borrar la cuenta. Las donaciones no son el problema: son el otro enlace.

## Decisión

Tu cuenta es **una sola página**. Se scrollea. No hay pestañas.

Orden, fijo:

1. Tu foto  
2. Cómo querés aparecer  
3. Contraseña  
4. Borrar la cuenta  

Mis donaciones sigue siendo el otro enlace del menú de trabajo (riel en escritorio, hamburguesa en el teléfono). No entra a esta página.

## Composición

### Teléfono (390 px primero)

Una columna, ese orden. Cada bloque es un `h2` + lead + su formulario, como hoy. El `h1` es «Tu cuenta». La foto tiene su propio bloque: no es un apéndice de cómo aparecer.

### Escritorio (`lg` y más)

La misma página, dos columnas:

- Izquierda: foto y cómo aparecer.  
- Derecha: contraseña y borrar.

El riel no cambia: Mis donaciones, Tu cuenta, y Backoffice si hay rol. Cerrar sesión sigue en el pie del riel.

## `?seccion=`

Sigue habiendo un solo query, porque `/cuenta` sin query abre **Mis donaciones** si hay reservas (hoy). Sin un valor propio, «Tu cuenta» no se puede enlazar.

| Valor | Qué abre |
|---|---|
| `reservas` | Mis donaciones (el otro enlace) |
| `cuenta` | La página de Tu cuenta, arriba |
| `aparecer` | Tu cuenta, bajando a cómo aparecer |
| `acceso` | Tu cuenta, bajando a contraseña |
| `borrar` | Tu cuenta, bajando a borrar |
| ausente | Reservas si hay alguna; si no, Tu cuenta |

Los tres valores viejos (`aparecer`, `acceso`, `borrar`) no se tiran: un POST o un enlace guardado sigue funcionando. Ya no pintan una pestaña; pintan la página entera y hacen scroll hasta el bloque. Cada bloque tiene `id` estable (`foto`, `aparecer`, `acceso`, `borrar`).

El enlace «Tu cuenta» del riel y del hamburguesa va a `?seccion=cuenta`. El de Mis donaciones sigue en `?seccion=reservas`.

Si hay `prefers-reduced-motion`, el salto al bloque es instantáneo.

## Copy

No se escribe prosa nueva. Se reusa la que ya está: `portraitHeading` / `portraitLead`, `appearanceHeading` / `appearanceLead`, `passwordHeading` / `passwordLead`, `deleteHeading` / `deleteLead`. `tabsLabel` deja de nombrar pestañas: el landmark del riel puede seguir usando ese string o el de la navegación de trabajo; no se inventa otro menú.

`tabAppearance`, `tabAccess` y `tabDelete` dejan de ser pestañas. No hace falta borrar las claves en este trabajo.

## Componentes y datos

- `AccountSettings` deja de montar `AccountSettingsTabs`. Apila los cuatro bloques. En `lg`, la grilla de dos columnas.
- `AppearancePanel` se parte: la foto sale a `PortraitPanel` (el `PortraitForm` de hoy). Cómo aparecer queda con el nombre, la casilla y el idioma.
- `AccessPanel` y `DeletePanel` no cambian por dentro.
- `AccountSettingsTabs` se borra.
- `ACCOUNT_SECTIONS` suma `cuenta`. `aparecer` / `acceso` / `borrar` siguen siendo válidos, como anclas, no como vistas.
- Mismos casos de uso, mismas actions, mismo retrato privado (ADR-037). No hay tabla ni puerto nuevo.

## Errores

Cada formulario sigue mostrando su error encima de **ese** formulario. Un POST que falla no esconde los otros tres bloques. El aviso de query (`notice`) sigue arriba de la página, como hoy.

Sin JavaScript se lee la página entera: ya no hay un índice de cliente que deje un solo panel.

## Accesibilidad

- Un `h1`: Tu cuenta. Cuatro `h2`, en ese orden.
- Los campos siguen con label visible. La marca del envío (cámara, tilde, basura) va antes del nombre (ADR-047).
- Objetivo táctil 44 px. Contraste 4.5:1. Foco visible.

## Tests

- Al abrir `?seccion=cuenta` se ven los cuatro `h2` (foto, aparecer, contraseña, borrar). No hay `tab`.
- `?seccion=acceso` muestra los cuatro y el bloque de contraseña está en el documento (el heading existe; no hay que cambiar de pestaña).
- El riel: Mis donaciones → `?seccion=reservas`. Tu cuenta → `?seccion=cuenta`. Con reservas, `/cuenta` sin query sigue abriendo donaciones.
- `abrirSeccionDeCuenta` deja de hacer clic en un tab. Entra a Tu cuenta y busca el heading.
- E2e de guardar nombre, subir foto, cambiar contraseña y borrar no cambian de action: sólo de cómo se llega al formulario.
- `work-nav` y `account-chrome`: el href de la cuenta ya no es `?seccion=aparecer`.

## Documentación en el mismo trabajo

- Enmendar ADR-037 §3: cómo aparecer, acceso y borrar dejan de ser pestañas. Son bloques de una página. `?seccion=` distingue Mis donaciones de Tu cuenta, y ancla el bloque.
- Una línea en `specs/002-cuentas-y-catalogo-de-donaciones/contracts/cuentas.md`.
- Tests e2e y de componente en el mismo cambio.

## Fuera de alcance

- Rediseñar Mis donaciones.
- Sacar el riel de trabajo o el chrome de «Mi Panel».
- Publicar el retrato.
- Cambiar contraseña, foto o borrado por otro flujo (correo, OAuth, etc.).
- Inventar un panel de ajustes aparte de `/cuenta`.

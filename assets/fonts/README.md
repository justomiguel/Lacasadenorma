# Tipografías para la imagen de compartir

Dos archivos, y están en el repositorio a propósito.

La imagen de OpenGraph se genera del lado servidor con `next/og`, que necesita el **binario** de la
tipografía para dibujar el texto. `next/font/google` descarga las fuentes de la página al construir y
las sirve autoalojadas, pero no expone el buffer: no hay forma de pedirle el archivo a
`next/font/google` desde un `ImageResponse`.

Las dos alternativas eran descargar la fuente desde `fonts.gstatic.com` en cada generación de la
imagen —una llamada de red en el camino crítico de una vista previa de WhatsApp, que falla en
silencio y deja el enlace sin imagen— o versionar el archivo. Se versiona: son archivos que no
viajan nunca al navegador, porque sólo los lee el servidor al componer la imagen.

| Archivo | Familia | Peso | Uso |
|---|---|---|---|
| `PlayfairDisplay-Regular.woff` | [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) | 400 | El título de la imagen |
| `Inter-Medium.woff` | [Inter](https://fonts.google.com/specimen/Inter) | 500 | La sobrelínea y el pie |

Son las instancias estáticas de las mismas familias que usa el sitio (ADR-025), así que la vista
previa y la página se ven de la misma familia. Ambas están bajo
[SIL Open Font License 1.1](https://openfontlicense.org/), que permite redistribuirlas dentro de un
proyecto.

Si alguna vez cambia la tipografía del sitio, hay que cambiar estos dos archivos también: no hay
nada que los mantenga sincronizados automáticamente, y una vista previa con otra tipografía se nota.

/**
 * Inserta un grafo de datos estructurados.
 *
 * El JSON va serializado con `JSON.stringify` y dentro de un `<script>` de tipo
 * `application/ld+json`, que el navegador **no** ejecuta: es un bloque de datos.
 * Aun así se usa `dangerouslySetInnerHTML`, porque React escaparía las comillas y
 * el JSON quedaría inválido. Es el único lugar del sitio con esa API, y es seguro
 * por una razón concreta: todo lo que entra viene de contenido versionado en el
 * repositorio o de campos de la base que ya son texto plano, nunca de una entrada
 * de usuario. Si algún día un dato de acá viniera de un formulario, este comentario
 * dejaría de ser cierto y habría que escaparlo.
 */
export function StructuredData({ json }: { json: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

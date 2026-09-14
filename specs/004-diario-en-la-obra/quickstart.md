# Quickstart: El diario se lee donde está la obra

1. Entrar a `/admin/novedades` como `editor`, guardar un borrador.
2. Insertar una foto: qué se ve, epígrafe, crédito. Guardar. Publicar.
3. En `/novedades/{slug}` el `figcaption` muestra epígrafe y crédito.
4. Volver a la novedad, insertar la misma foto desde la lista, guardar: el
   cuerpo la nombra dos veces y al final del artículo no se duplica.
5. `/reconstruccion` muestra esa entrada arriba del llamado a ayudar.
6. `GET /novedades.xml` la lista. Un borrador no aparece.

Sin base de datos, `/reconstruccion` no menciona el diario y `/novedades.xml`
es un canal vacío (no un error disfrazado de "cero entradas" en la página).

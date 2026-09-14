import { handleBuzon } from "./buzon.mjs";
import { query } from "./db.mjs";
import { json, readBody } from "./http.mjs";

/**
 * Lo que no emula a Supabase: el buzón y las palancas que una prueba necesita
 * y una persona autenticada no puede tocar.
 *
 * Vencer una reserva pide escribir `expires_at`, y `authenticated` no tiene
 * GRANT sobre esa columna. Sin este POST, el vencimiento auto-sanante de
 * `release_expired_holds()` no se podría recorrer desde Playwright (T054).
 */
export async function handleHarness(incoming, outgoing, url) {
  const [ruta] = url.slice("/harness/v1".length).split("?");

  if (ruta === "/buzon") {
    await handleBuzon(incoming, outgoing, url);
    return;
  }

  if (ruta === "/vencer-reserva") {
    await vencerReserva(incoming, outgoing);
    return;
  }

  json(outgoing, 404, {
    message:
      "El harness contesta GET /harness/v1/buzon?email=… y POST /harness/v1/vencer-reserva.",
  });
}

async function vencerReserva(incoming, outgoing) {
  if (incoming.method !== "POST") {
    json(outgoing, 405, { message: "vencer-reserva sólo acepta POST." });
    return;
  }

  const body = await readBody(incoming);
  const pledgeId = typeof body.pledgeId === "string" ? body.pledgeId.trim() : "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(pledgeId)
  ) {
    json(outgoing, 400, { message: "Falta pledgeId, o no es un UUID." });
    return;
  }

  /**
   * El `WITH` de escritura tiene que ir al tope de la sentencia. Postgres no
   * admite un CTE que hace `UPDATE` adentro de un `SELECT` (`select coalesce((with
   * marked as (update …)))`): lo rechaza con "WITH clause containing a
   * data-modifying statement must be at the top level".
   */
  const resultado = await query(
    `
      with marked as (
        update public.donation_pledges
           set expires_at = now() - interval '1 minute'
         where id = :'id'::uuid
           and status = 'reserved'
        returning item_id
      )
      select coalesce(
        (
          select json_build_object(
            'itemId', m.item_id,
            'released', public.release_expired_holds(m.item_id)
          )
          from marked m
        ),
        'null'::json
      );
    `,
    { id: pledgeId.toLowerCase() },
  );

  if (resultado === null) {
    json(outgoing, 404, { message: "No hay una reserva activa con ese id." });
    return;
  }

  json(outgoing, 200, resultado);
}

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

/**
 * Recordatorios de reservas a tres días del plazo, y aviso al equipo a los 14
 * días si no confirmaron la llegada.
 *
 * Vive fuera de la aplicación web a propósito: no usa `SUPABASE_SECRET_KEY` ni
 * corre detrás de una ruta HTTP. Lo dispara un cron (Vercel, systemd, o el
 * panel) con `DATABASE_URL` y, si hay, `RESEND_API_KEY`.
 *
 * Nada se cancela solo. El plazo avisa. La deduplicación permanente es
 * `email_deliveries` (`pledge.reminder` y `staff.pledge_expired`) y
 * `reminded_at` para el correo a quien reservó (FR-235, SC-210).
 */

const DB_URL =
  process.env.DATABASE_URL ??
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://norma_local:norma_local@127.0.0.1:5432/norma_dev";

const SITE_URL = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://lacasadenorma.org"
).replace(/\/$/, "");

const RESEND_URL = "https://api.resend.com/emails";

const STAFF_ADDRESS = process.env.EMAIL_STAFF_ADDRESS?.trim() ?? "";

const DUE = `
  select coalesce((
    select json_agg(row_to_json(r))
    from (
      select
        p.id,
        p.expires_at,
        i.title,
        u.email,
        pr.locale
      from public.donation_pledges p
      join public.donation_items i on i.id = p.item_id
      join public.donor_profiles pr on pr.id = p.user_id
      join auth.users u on u.id = p.user_id
      where p.status = 'reserved'
        and p.reminded_at is null
        and p.user_id is not null
        and p.expires_at > now()
        and p.expires_at <= now() + interval '3 days'
        and not exists (
          select 1
            from public.email_deliveries d
           where d.kind = 'pledge.reminder'
             and d.pledge_id = p.id
             and d.status = 'sent'
        )
      order by p.expires_at
    ) r
  ), '[]'::json);
`;

const OVERDUE = `
  select coalesce((
    select json_agg(row_to_json(r))
    from (
      select
        p.id,
        i.title
      from public.donation_pledges p
      join public.donation_items i on i.id = p.item_id
      where p.status = 'reserved'
        and p.expires_at <= now()
        and not exists (
          select 1
            from public.email_deliveries d
           where d.kind = 'staff.pledge_expired'
             and d.pledge_id = p.id
             and d.status = 'sent'
        )
      order by p.expires_at
    ) r
  ), '[]'::json);
`;

function query(sqlText, variables = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      DB_URL,
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
    ];

    for (const [name, value] of Object.entries(variables)) {
      args.push("--set", `${name}=${value}`);
    }

    const child = spawn("psql", args, { stdio: ["pipe", "pipe", "pipe"] });
    let salida = "";
    let error = "";

    child.stdout.on("data", (chunk) => {
      salida += chunk;
    });
    child.stderr.on("data", (chunk) => {
      error += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(error.trim() || `psql terminó con código ${String(code)}`));
        return;
      }

      try {
        resolve(JSON.parse(salida.trim() || "null"));
      } catch {
        reject(new Error(`La consulta no devolvió JSON: ${salida.trim()}`));
      }
    });

    child.stdin.end(sqlText);
  });
}

function fill(text, values) {
  if (values.when === null && text.includes("{when}")) {
    return "";
  }

  return text
    .replaceAll("{what}", values.what ?? "")
    .replaceAll("{when}", values.when ?? "")
    .replaceAll("{link}", values.link);
}

function formatWhen(iso, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

async function copyOf(locale, key) {
  const file = path.join("content", locale, "emails.json");
  const raw = JSON.parse(await readFile(file, "utf8"));

  return raw[key];
}

async function sendResend(message) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();

  if (
    apiKey === undefined ||
    apiKey.length === 0 ||
    from === undefined ||
    from.length === 0
  ) {
    return { status: "skipped", providerId: null, error: "sin credencial de Resend" };
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();

    return {
      status: "failed",
      providerId: null,
      error: detail.slice(0, 500),
    };
  }

  const body = await response.json();
  const providerId = typeof body.id === "string" ? body.id : null;

  return { status: "sent", providerId, error: null };
}

async function recordDelivery(kind, pledgeId, email, result, markReminded) {
  const remindSql = markReminded
    ? `
      update public.donation_pledges
         set reminded_at = now()
       where id = :'id'::uuid
         and status = 'reserved'
         and reminded_at is null;
    `
    : "";

  await query(
    `
      ${remindSql}
      insert into public.email_deliveries
        (kind, pledge_id, recipient, status, provider_id, error)
      values (
        :'kind',
        :'id'::uuid,
        nullif(:'email', ''),
        :'status',
        nullif(:'provider', ''),
        null
      );

      select 'null'::json;
    `,
    {
      kind,
      id: pledgeId,
      email: email ?? "",
      status: result.status,
      provider: result.providerId ?? "",
    },
  );
}

async function remindDonors() {
  const due = await query(DUE);

  if (!Array.isArray(due) || due.length === 0) {
    process.stdout.write("Sin reservas para recordar.\n");
    return;
  }

  for (const row of due) {
    const locale = row.locale === "en" ? "en" : "es";
    const copy = await copyOf(locale, "pledgeReminder");
    const when = formatWhen(row.expires_at, locale);
    const link = `${SITE_URL}${locale === "en" ? "/en" : ""}/cuenta`;
    const values = { what: row.title, when, link };
    const subject = fill(copy.subject, values);
    const text = [
      ...copy.body.map((paragraph) => fill(paragraph, values)),
      copy.action,
      link,
    ]
      .filter((line) => line.length > 0)
      .join("\n\n");

    const result = await sendResend({
      to: row.email,
      subject,
      text,
      idempotencyKey: `pledge.reminder/${row.id}`,
    });

    if (result.status !== "sent") {
      process.stderr.write(
        `${result.status} ${row.id}: ${result.error ?? "sin envío"}\n`,
      );
      continue;
    }

    await recordDelivery("pledge.reminder", row.id, row.email, result, true);
    process.stdout.write(`sent ${row.id} ${row.email}\n`);
  }
}

async function notifyStaffOverdue() {
  if (STAFF_ADDRESS.length === 0) {
    process.stdout.write("Sin EMAIL_STAFF_ADDRESS: no se avisa el plazo al equipo.\n");
    return;
  }

  const overdue = await query(OVERDUE);

  if (!Array.isArray(overdue) || overdue.length === 0) {
    process.stdout.write("Sin reservas con el plazo vencido para avisar.\n");
    return;
  }

  const copy = await copyOf("es", "staffPledgeExpired");

  for (const row of overdue) {
    const yes = `${SITE_URL}/admin/donaciones/decidir/${row.id}/si`;
    const no = `${SITE_URL}/admin/donaciones/decidir/${row.id}/no`;
    const values = { what: row.title, when: null, link: yes };
    const subject = fill(copy.subject, values);
    const text = [
      ...copy.body.map((paragraph) => fill(paragraph, values)),
      copy.action,
      yes,
      copy.rejectAction,
      no,
    ]
      .filter((line) => line.length > 0)
      .join("\n\n");

    const result = await sendResend({
      to: STAFF_ADDRESS,
      subject,
      text,
      idempotencyKey: `staff.pledge_expired/${row.id}`,
    });

    if (result.status !== "sent") {
      process.stderr.write(
        `${result.status} ${row.id}: ${result.error ?? "sin envío"}\n`,
      );
      continue;
    }

    await recordDelivery("staff.pledge_expired", row.id, "", result, false);
    process.stdout.write(`staff ${row.id}\n`);
  }
}

async function main() {
  await remindDonors();
  await notifyStaffOverdue();
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

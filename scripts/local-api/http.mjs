export function readBearer(incoming) {
  const header = incoming.headers["authorization"];

  if (typeof header !== "string" || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice("bearer ".length).trim();
}

export function readBody(incoming) {
  return new Promise((resolve, reject) => {
    let crudo = "";

    incoming.on("data", (chunk) => {
      crudo += chunk;
    });
    incoming.on("end", () => {
      if (crudo.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(crudo));
      } catch {
        resolve({});
      }
    });
    incoming.on("error", reject);
  });
}

export function json(outgoing, status, body) {
  outgoing.writeHead(status, {
    "content-type": "application/json",
    // Una respuesta con un token adentro no se cachea en ninguna parte.
    "cache-control": "no-store",
  });
  outgoing.end(JSON.stringify(body));
}

/** Los mismos códigos que devuelve GoTrue: la aplicación los registra y los mira. */
export function authError(outgoing, status, code, message) {
  json(outgoing, status, { code: status, error_code: code, msg: message });
}

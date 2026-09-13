/**
 * El mismo secreto de desarrollo que documenta Supabase para su entorno local.
 * Está en claro a propósito: si estuviera en una variable, alguien lo trataría
 * como un secreto y lo copiaría a producción.
 */
export const JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

export const DB_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://norma_local:norma_local@127.0.0.1:5432/norma_dev";

export const POSTGREST_VERSION = "v16.2";
export const BIN_DIR = ".local/bin";
export const POSTGREST_PORT = Number(process.env.POSTGREST_PORT ?? 54331);
export const API_PORT = Number(process.env.LOCAL_API_PORT ?? 54321);
export const SESSION_SECONDS = 3600;

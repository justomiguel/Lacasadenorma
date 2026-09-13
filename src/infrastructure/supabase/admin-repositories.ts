/**
 * Implementación del backoffice sobre Supabase.
 *
 * El puerto vive partido por responsabilidad en `admin/`. Este archivo es el
 * punto de entrada que ya importaba el resto del proyecto.
 */
export { createAdminGateway, getAdminGateway } from "./admin/gateway";

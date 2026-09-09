import type {
  CampaignRepository,
  MilestoneRepository,
  PaymentMethodRepository,
  TransparencyRepository,
  UpdateRepository,
} from "@/src/domain/ports/repositories";

/**
 * De dónde salen los datos operativos.
 *
 * Es una unión discriminada, no un objeto con campos opcionales: `content-only`
 * no es "Supabase con los repositorios en null", es un modo de operación
 * distinto y completo. La diferencia se nota en el tipo, así que un caso de uso
 * no puede olvidarse de manejarlo.
 *
 * `source` es el mismo valor que devuelve `/api/health` en `dataSource`, para que
 * diagnosticar un despliegue que levanta pero no ve la base sea una sola
 * consulta.
 */
export type DataLayer =
  | {
      readonly source: "supabase";
      readonly campaigns: CampaignRepository;
      readonly transparency: TransparencyRepository;
      readonly milestones: MilestoneRepository;
      readonly paymentMethods: PaymentMethodRepository;
      readonly updates: UpdateRepository;
    }
  | { readonly source: "content-only" };

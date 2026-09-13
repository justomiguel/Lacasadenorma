export const CAMPAIGN_COLUMNS =
  "id, slug, title, summary, goal_amount_minor, goal_currency, status, reconciled_at";

export const BUDGET_ITEM_COLUMNS =
  "id, title, description, estimated_amount_minor, currency, sort_order, published_at";

export const CONTRIBUTION_COLUMNS =
  "id, amount_minor, currency, received_at, payment_method_id, source_note, is_anonymous, voided_at, void_reason, recorded_by";

export const EXPENSE_ADMIN_COLUMNS =
  "id, amount_minor, currency, spent_at, concept, category, supplier, budget_item_id, receipt_count, voided_at, void_reason, published_at, recorded_by";

export const MILESTONE_COLUMNS =
  "id, title, description, status, happened_on, sort_order, published_at";

export const PAYMENT_METHOD_COLUMNS =
  "id, kind, country_code, currency, label, fields, instructions, sort_order, published_at";

export const RECEIPT_COLUMNS =
  "id, expense_id, storage_path, file_name, mime_type, size_bytes";

export const MEDIA_COLUMNS =
  "id, storage_path, alt_text, caption, credit, width, height, taken_on";

export const UPDATE_COLUMNS = `id, slug, title, body, published_at, update_media(sort_order, media(${MEDIA_COLUMNS}))`;

export const PHOTO_BUCKET = "fotos";
export const RECEIPT_BUCKET = "comprobantes";

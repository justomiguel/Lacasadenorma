import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Unavailable } from "@/components/campaign/unavailable";
import { CatalogItem } from "@/components/catalog/item";
import { ConflictNotice } from "@/components/catalog/conflict-notice";
import { OfferThanksNotice } from "@/components/catalog/offer-thanks";
import { SecondaryAction } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { keepStaleOnError } from "@/src/application/result";
import { getCatalogClaims } from "@/src/application/use-cases/get-catalog-claims";
import { getCatalogItem } from "@/src/application/use-cases/get-catalog-item";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

const ITEM_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type CatalogItemProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function readItem(id: string) {
  return keepStaleOnError(
    await getCatalogItem({ dataLayer: getPublicDataLayer(), logger, itemId: id }),
  );
}

export async function catalogItemMetadata(
  locale: Locale,
  props: CatalogItemProps,
): Promise<Metadata> {
  const { id } = await props.params;
  const { catalog, site } = getContent(locale);

  if (!ITEM_ID.test(id)) {
    return pageMetadata({
      locale,
      title: catalog.title,
      description: catalog.seoDescription,
      path: `/catalogo/${id}`,
      noIndex: true,
    });
  }

  const result = await readItem(id);

  if (result.status !== "ok" || result.data === null) {
    return pageMetadata({
      locale,
      title: catalog.title,
      description: site.shortDescription,
      path: `/catalogo/${id}`,
      noIndex: true,
    });
  }

  return pageMetadata({
    locale,
    title: result.data.title,
    description: result.data.description ?? catalog.seoDescription,
    path: `/catalogo/${id}`,
  });
}

export async function CatalogItemScreen({
  locale,
  params,
  searchParams,
}: {
  locale: Locale;
} & CatalogItemProps) {
  const { id } = await params;
  const query = await searchParams;
  const { catalog, account, ui, help } = getContent(locale);

  if (!ITEM_ID.test(id)) {
    notFound();
  }

  const [result, claimsResult] = await Promise.all([
    readItem(id),
    getCatalogClaims({ dataLayer: getPublicDataLayer(), logger }).then(keepStaleOnError),
  ]);
  const claims = claimsResult.status === "ok" ? claimsResult.data : [];
  const conflicto = query["conflicto"];
  const reservado = query["reservado"];

  if (result.status !== "ok") {
    return (
      <>
        <PageHeader title={catalog.title} lead={catalog.lead} />
        <Container>
          <Section>
            <Unavailable
              reason={result.reason}
              title={catalog.unavailableTitle}
              copy={ui.unavailable}
            />
          </Section>
        </Container>
      </>
    );
  }

  if (result.data === null) {
    notFound();
  }

  const item = result.data;

  return (
    <>
      {typeof conflicto === "string" || typeof reservado === "string" ? (
        <Container>
          <Section tight>
            {typeof conflicto === "string" ? <ConflictNotice copy={catalog} /> : null}
            {typeof reservado === "string" ? (
              <OfferThanksNotice
                copy={catalog}
                dismissHref={localizedHref(`/catalogo/${id}`, locale)}
              />
            ) : null}
          </Section>
        </Container>
      ) : null}
      <Container>
        <Section className="pt-0 lg:pt-3xl">
          <CatalogItem
            item={item}
            claims={claims}
            copy={catalog}
            account={account}
            help={help}
            ui={ui}
            locale={locale}
            priority
          />
        </Section>
      </Container>
      <Container>
        <Section tight className="border-t border-rule">
          <SecondaryAction href={localizedHref("/catalogo", locale)}>
            {catalog.backToList}
          </SecondaryAction>
        </Section>
      </Container>
    </>
  );
}

import { CatalogLoading } from "@/components/catalog/item";
import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";

export default function CatalogLoadingPage() {
  const { catalog } = getContent("en");

  return (
    <>
      <PageHeader title={catalog.title} lead={catalog.lead} />
      <Container>
        <Section>
          <CatalogLoading message={catalog.loading} />
        </Section>
      </Container>
    </>
  );
}

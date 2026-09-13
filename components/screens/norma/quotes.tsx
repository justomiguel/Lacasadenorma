import { Band, Container, Section } from "@/components/design-system/layout";
import type { PersonContent, UiContent } from "@/content/schema";

export function NormaQuotes({
  quotes,
  heading,
}: {
  quotes: PersonContent["quotes"];
  heading: UiContent["normaPage"]["quotesHeading"];
}) {
  if (quotes.length === 0) {
    return null;
  }

  return (
    <Band tone="sunk">
      <Container>
        <Section labelledBy="voces" chapter="norma">
          <h2 id="voces" className="font-display text-title">
            {heading}
          </h2>
          <ul className="mt-2xl space-y-2xl">
            {quotes.map((entry) => (
              <li key={entry.author} className="max-w-quote">
                <blockquote className="font-display text-heading italic">
                  «{entry.quote}»
                </blockquote>
                <p className="mt-md font-ui text-small text-ink-muted">
                  {entry.author}
                  <span className="block">{entry.relation}</span>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </Container>
    </Band>
  );
}

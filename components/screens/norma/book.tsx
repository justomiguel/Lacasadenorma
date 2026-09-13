import { FileAction } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import type { PersonContent, UiContent } from "@/content/schema";

import { StoryPhoto } from "./story-photo";

export function NormaBook({ book, ui }: { book: PersonContent["book"]; ui: UiContent }) {
  return (
    <Container>
      <Section labelledBy="el-libro" chapter="norma">
        <div className="grid items-start gap-2xl lg:grid-cols-12">
          <div className="lg:col-span-4">
            <StoryPhoto media={book.cover} sizes="(min-width: 64rem) 28vw, 70vw" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6" data-reveal="">
            <p
              data-kicker=""
              className="font-ui text-label uppercase tracking-label text-olive"
            >
              {ui.normaPage.bookKicker}
            </p>
            <h2 id="el-libro" className="mt-md font-display text-title">
              {book.title}
            </h2>
            {book.subtitle === null ? null : (
              <p className="mt-sm max-w-measure text-lead text-ink-muted">
                {book.subtitle}
              </p>
            )}
            <p className="mt-lg max-w-measure text-body">{book.lead}</p>
            <p className="mt-md font-ui text-small text-ink-muted">
              {book.author}, {book.year}
            </p>
            <div className="mt-xl flex flex-wrap gap-md">
              <FileAction href={book.href}>{ui.normaPage.bookRead}</FileAction>
              <FileAction href={book.href} download="norma-edith-bedoya.pdf">
                {ui.normaPage.bookDownload}
              </FileAction>
            </div>
          </div>
        </div>
      </Section>
    </Container>
  );
}

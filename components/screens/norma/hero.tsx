import { Container } from "@/components/design-system/layout";
import type { PersonContent, UiContent } from "@/content/schema";

import { StoryPhoto } from "./story-photo";

export function NormaHero({ norma, ui }: { norma: PersonContent; ui: UiContent }) {
  return (
    <header className="bg-paper">
      <Container className="pb-3xl pt-3xl lg:pb-5xl lg:pt-5xl">
        <div className="grid items-end gap-3xl lg:grid-cols-12">
          <div className="lg:col-span-7" data-reveal="">
            <p
              data-kicker=""
              className="font-ui text-label uppercase tracking-label text-olive"
            >
              {ui.home.chapterNorma}
            </p>
            <h1
              id="norma"
              className="mt-md max-w-quote whitespace-pre-line font-display text-display"
            >
              {norma.openingTitle}
            </h1>
            <p className="mt-xl max-w-measure text-lead">{norma.summary}</p>
            <p className="mt-lg max-w-measure text-body text-ink-muted">
              {norma.paragraphs[0]}
            </p>
          </div>
          {norma.portrait === null ? null : (
            <div className="lg:col-span-4 lg:col-start-9">
              <StoryPhoto
                media={norma.portrait}
                showCaption={false}
                priority
                sizes="(min-width: 64rem) 32vw, 90vw"
              />
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}

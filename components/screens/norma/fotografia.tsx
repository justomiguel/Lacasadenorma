import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function FotografiaChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  const obelisco = chapter.photos[0];
  const toma = chapter.photos[1];

  return (
    <ChapterFrame id={CHAPTER_IDS[3]}>
      <div data-reveal="" className="max-w-quote">
        <ChapterTitle id={CHAPTER_IDS[3]}>{chapter.title}</ChapterTitle>
        <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
      </div>
      {obelisco === undefined ? null : (
        <StoryPhoto
          media={obelisco}
          className="mt-2xl"
          sizes="(min-width: 64rem) 80vw, 100vw"
        />
      )}
      {toma === undefined ? null : (
        <div className="mt-lg max-w-prose">
          <StoryPhoto
            media={toma}
            direction="wipe-x"
            sizes="(min-width: 64rem) 40vw, 90vw"
          />
        </div>
      )}
    </ChapterFrame>
  );
}

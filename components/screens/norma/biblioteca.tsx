import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function BibliotecaChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  const edificio = chapter.photos[0];
  const placa = chapter.photos[1];

  return (
    <ChapterFrame id={CHAPTER_IDS[4]} band="sunk">
      <div data-reveal="" className="max-w-quote">
        <ChapterTitle id={CHAPTER_IDS[4]}>{chapter.title}</ChapterTitle>
        <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
      </div>
      <div className="mt-2xl grid items-start gap-lg lg:grid-cols-2">
        {edificio === undefined ? null : (
          <StoryPhoto media={edificio} sizes="(min-width: 64rem) 45vw, 90vw" />
        )}
        {placa === undefined ? null : (
          <StoryPhoto
            media={placa}
            direction="wipe-x"
            sizes="(min-width: 64rem) 40vw, 90vw"
          />
        )}
      </div>
    </ChapterFrame>
  );
}

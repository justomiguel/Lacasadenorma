import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function ReconocimientoChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  const cartel = chapter.photos[0];

  return (
    <ChapterFrame id={CHAPTER_IDS[5]}>
      <div data-reveal="" className="max-w-quote">
        <ChapterTitle id={CHAPTER_IDS[5]}>{chapter.title}</ChapterTitle>
        <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
      </div>
      {cartel === undefined ? null : (
        <StoryPhoto
          media={cartel}
          direction="wipe-x"
          className="mt-2xl"
          sizes="(min-width: 64rem) 80vw, 100vw"
        />
      )}
    </ChapterFrame>
  );
}

import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function NoticiasChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  const recorte = chapter.photos[0];

  return (
    <ChapterFrame id={CHAPTER_IDS[1]} band="sunk">
      <div className="grid items-start gap-2xl lg:grid-cols-12">
        <div className="lg:col-span-6" data-reveal="">
          <ChapterTitle id={CHAPTER_IDS[1]}>{chapter.title}</ChapterTitle>
          <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
        </div>
        {recorte === undefined ? null : (
          <div className="lg:col-span-5 lg:col-start-8">
            <StoryPhoto
              media={recorte}
              direction="wipe-x"
              sizes="(min-width: 64rem) 32vw, 90vw"
            />
          </div>
        )}
      </div>
    </ChapterFrame>
  );
}

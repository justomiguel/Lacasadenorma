import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function MujerChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  const conMama = chapter.photos[0];

  return (
    <ChapterFrame id={CHAPTER_IDS[6]} band="sunk">
      <div className="grid items-start gap-3xl lg:grid-cols-12">
        <div className="lg:col-span-6" data-reveal="">
          <ChapterTitle id={CHAPTER_IDS[6]}>{chapter.title}</ChapterTitle>
          <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
        </div>
        {conMama === undefined ? null : (
          <div className="lg:col-span-5 lg:col-start-8">
            <StoryPhoto media={conMama} sizes="(min-width: 64rem) 32vw, 80vw" />
          </div>
        )}
      </div>
    </ChapterFrame>
  );
}

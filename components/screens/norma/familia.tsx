import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent, UiContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function FamiliaChapter({
  chapter,
  photosNote,
}: {
  chapter: PersonContent["chapters"][number];
  photosNote: UiContent["normaPage"]["photosNote"];
}) {
  const juventud = chapter.photos[0];

  return (
    <ChapterFrame id={CHAPTER_IDS[7]}>
      <div className="grid items-center gap-2xl lg:grid-cols-12">
        {juventud === undefined ? null : (
          <div className="lg:col-span-7">
            <StoryPhoto media={juventud} sizes="(min-width: 64rem) 55vw, 90vw" />
          </div>
        )}
        <div className="lg:col-span-5" data-reveal="">
          <ChapterTitle id={CHAPTER_IDS[7]}>{chapter.title}</ChapterTitle>
          <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
          <p className="mt-xl max-w-measure font-ui text-small text-ink-muted">
            {photosNote}
          </p>
        </div>
      </div>
    </ChapterFrame>
  );
}

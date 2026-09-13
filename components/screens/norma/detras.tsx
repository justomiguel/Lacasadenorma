import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent, Photo } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";
import { StoryPhoto } from "./story-photo";

export function DetrasChapter({
  chapter,
  retrato,
  flores,
}: {
  chapter: PersonContent["chapters"][number];
  retrato: Photo | undefined;
  flores: Photo | undefined;
}) {
  return (
    <ChapterFrame id={CHAPTER_IDS[2]} band="forest">
      <div data-reveal="" className="max-w-quote">
        <ChapterTitle id={CHAPTER_IDS[2]} size="display">
          {chapter.title}
        </ChapterTitle>
        <Paragraphs items={[...chapter.paragraphs]} className="mt-xl" />
      </div>
      {retrato === undefined && flores === undefined ? null : (
        <div className="mt-2xl grid gap-md sm:grid-cols-2">
          {retrato === undefined ? null : (
            <StoryPhoto
              media={retrato}
              showCaption={false}
              sizes="(min-width: 64rem) 40vw, 90vw"
            />
          )}
          {flores === undefined ? null : (
            <StoryPhoto
              media={flores}
              direction="wipe-x"
              showCaption={false}
              sizes="(min-width: 64rem) 40vw, 90vw"
            />
          )}
        </div>
      )}
    </ChapterFrame>
  );
}

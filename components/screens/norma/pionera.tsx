import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent } from "@/content/schema";

import { CHAPTER_IDS, ChapterFrame, ChapterTitle } from "./chapter-frame";

export function PioneraChapter({
  chapter,
}: {
  chapter: PersonContent["chapters"][number];
}) {
  return (
    <ChapterFrame id={CHAPTER_IDS[0]}>
      <div data-reveal="" className="max-w-quote">
        <ChapterTitle id={CHAPTER_IDS[0]}>{chapter.title}</ChapterTitle>
        <Paragraphs items={[...chapter.paragraphs]} className="mt-lg" />
      </div>
    </ChapterFrame>
  );
}

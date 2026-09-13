import { type ReactNode } from "react";

import { Band, Container, Section } from "@/components/design-system/layout";

export const CHAPTER_IDS = [
  "pionera",
  "noticias",
  "detras",
  "fotografia",
  "biblioteca",
  "reconocimiento",
  "mujer",
  "familia",
] as const;

export function ChapterFrame({
  id,
  band,
  children,
}: {
  id: string;
  band?: "sunk" | "forest";
  children: ReactNode;
}) {
  const inner = (
    <Container>
      <Section labelledBy={id} chapter="norma">
        {children}
      </Section>
    </Container>
  );

  return band === undefined ? inner : <Band tone={band}>{inner}</Band>;
}

export function ChapterTitle({
  id,
  children,
  size = "title",
}: {
  id: string;
  children: ReactNode;
  size?: "title" | "display";
}) {
  return (
    <h2
      id={id}
      className={
        size === "display"
          ? "whitespace-pre-line font-display text-display"
          : "whitespace-pre-line font-display text-title"
      }
    >
      {children}
    </h2>
  );
}

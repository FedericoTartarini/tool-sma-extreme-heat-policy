import type { AboutParagraph, AboutSection } from "@/domain/about";

interface AboutParagraphBlock {
  type: "paragraph";
  paragraph: AboutParagraph;
}

interface AboutListBlock {
  type: "list";
  items: AboutParagraph[];
}

export type AboutContentBlock = AboutParagraphBlock | AboutListBlock;

function isPlainTextRun(
  run: AboutParagraph["runs"][number] | undefined,
): run is { text: string } {
  if (run === undefined) {
    return false;
  }

  return !("href" in run);
}

function isBulletParagraph(paragraph: AboutParagraph): boolean {
  const [firstRun] = paragraph.runs;

  return isPlainTextRun(firstRun) && firstRun.text.startsWith("- ");
}

function stripBulletPrefix(paragraph: AboutParagraph): AboutParagraph {
  const [firstRun, ...remainingRuns] = paragraph.runs;

  if (!isPlainTextRun(firstRun) || !firstRun.text.startsWith("- ")) {
    return paragraph;
  }

  const strippedFirstRun = {
    ...firstRun,
    text: firstRun.text.slice(2),
  };

  const runs =
    strippedFirstRun.text.length > 0
      ? [strippedFirstRun, ...remainingRuns]
      : remainingRuns;

  return {
    ...paragraph,
    runs,
  };
}

/**
 * Groups About copy into paragraphs and display-only bullet lists.
 */
export function buildAboutContentBlocks(
  section: AboutSection,
): AboutContentBlock[] {
  if (section.iconKey !== "unacceptable-activity") {
    return section.paragraphs.map((paragraph) => ({
      type: "paragraph",
      paragraph,
    }));
  }

  const blocks: AboutContentBlock[] = [];
  let currentListItems: AboutParagraph[] = [];

  const flushListItems = () => {
    if (currentListItems.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: currentListItems,
    });
    currentListItems = [];
  };

  section.paragraphs.forEach((paragraph) => {
    if (isBulletParagraph(paragraph)) {
      currentListItems.push(stripBulletPrefix(paragraph));
      return;
    }

    flushListItems();
    blocks.push({
      type: "paragraph",
      paragraph,
    });
  });

  flushListItems();

  return blocks;
}

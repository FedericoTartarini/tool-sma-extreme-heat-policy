import { describe, expect, it } from "vitest";
import type { AboutSection } from "@/domain/about";
import { buildAboutContentBlocks } from "@/lib/aboutLayout";

describe("buildAboutContentBlocks", () => {
  it("keeps non-unacceptable sections as ordered paragraphs", () => {
    const section: AboutSection = {
      iconKey: "overview",
      title: "Overview",
      paragraphs: [
        {
          runs: [{ text: "First paragraph." }],
        },
        {
          runs: [{ text: "Second paragraph." }],
        },
      ],
    };

    expect(buildAboutContentBlocks(section)).toEqual([
      {
        type: "paragraph",
        paragraph: section.paragraphs[0],
      },
      {
        type: "paragraph",
        paragraph: section.paragraphs[1],
      },
    ]);
  });

  it("groups consecutive unacceptable-activity bullet paragraphs into a list", () => {
    const section: AboutSection = {
      iconKey: "unacceptable-activity",
      title: "Unacceptable Activity",
      paragraphs: [
        {
          runs: [{ text: "You must not do any act including:" }],
        },
        {
          runs: [{ text: "- First bullet;" }],
        },
        {
          runs: [{ text: "- Second bullet." }],
        },
      ],
    };

    expect(buildAboutContentBlocks(section)).toEqual([
      {
        type: "paragraph",
        paragraph: section.paragraphs[0],
      },
      {
        type: "list",
        items: [
          {
            runs: [{ text: "First bullet;" }],
          },
          {
            runs: [{ text: "Second bullet." }],
          },
        ],
      },
    ]);
  });

  it("keeps non-bullet lead text as a paragraph before the list", () => {
    const section: AboutSection = {
      iconKey: "unacceptable-activity",
      title: "Unacceptable Activity",
      paragraphs: [
        {
          runs: [{ text: "Lead paragraph." }],
        },
        {
          runs: [{ text: "- Bullet item." }],
        },
        {
          runs: [{ text: "Closing paragraph." }],
        },
      ],
    };

    expect(buildAboutContentBlocks(section)).toEqual([
      {
        type: "paragraph",
        paragraph: section.paragraphs[0],
      },
      {
        type: "list",
        items: [
          {
            runs: [{ text: "Bullet item." }],
          },
        ],
      },
      {
        type: "paragraph",
        paragraph: section.paragraphs[2],
      },
    ]);
  });

  it("does not misclassify linked paragraphs as bullet items", () => {
    const section: AboutSection = {
      iconKey: "unacceptable-activity",
      title: "Unacceptable Activity",
      paragraphs: [
        {
          runs: [
            {
              text: "Guidelines download",
              href: "https://example.com/guide.pdf",
            },
          ],
        },
      ],
    };

    expect(buildAboutContentBlocks(section)).toEqual([
      {
        type: "paragraph",
        paragraph: section.paragraphs[0],
      },
    ]);
  });
});

export type AboutSectionIconKey =
  | "overview"
  | "functionalities"
  | "heat-risk"
  | "uv-guide"
  | "terms"
  | "medical-disclaimer"
  | "warranty"
  | "privacy"
  | "unacceptable-activity";

export interface AboutParagraphRun {
  text: string;
  href: string;
}

export interface AboutParagraph {
  runs: Array<
    | {
        text: string;
      }
    | AboutParagraphRun
  >;
  italic?: boolean;
}

export interface AboutSection {
  iconKey: AboutSectionIconKey;
  title: string;
  paragraphs: AboutParagraph[];
}

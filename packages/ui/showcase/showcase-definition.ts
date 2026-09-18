import type { ComponentType } from "react";

export const showcaseStages = ["dev", "test", "prod"] as const;

export type ShowcaseStage = (typeof showcaseStages)[number];

export interface ShowcaseExample {
  readonly code: string;
  readonly description?: string;
  readonly id: string;
  readonly name: string;
  readonly preview: ComponentType;
}

export interface ShowcaseApiItem {
  readonly defaultValue?: string;
  readonly description: string;
  readonly name: string;
  readonly type: string;
}

export interface ComponentShowcase {
  readonly accessibility?: ReadonlyArray<string>;
  readonly api?: ReadonlyArray<ShowcaseApiItem>;
  readonly category: string;
  readonly description: string;
  readonly examples: ReadonlyArray<ShowcaseExample>;
  readonly id: string;
  readonly name: string;
  readonly stage: ShowcaseStage;
  readonly usage?: string;
  readonly whenToUse?: ReadonlyArray<string>;
}

export function defineShowcase<const TShowcase extends ComponentShowcase>(showcase: TShowcase) {
  return showcase;
}

export function defineShowcases<const TShowcases extends ReadonlyArray<ComponentShowcase>>(
  showcases: TShowcases,
) {
  return showcases;
}

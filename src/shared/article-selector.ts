import { getArticleSelectorOverrides } from "@/shared/plugin-config";
import { getSelectorVariants } from "@/shared/string-case";

type ArticleSelector = {
  selector: string;
  preferred: boolean;
};

/** kebab-case 기준 selector 목록 */
const BASE_TISTORY_ARTICLE_SELECTORS_KEBAB = [
  { selector: ".contents-style", preferred: true },
  { selector: ".entry-content", preferred: true },
  { selector: ".area-view", preferred: true },
  { selector: ".post-content", preferred: true },
  { selector: ".article-view", preferred: true },
  { selector: "#article", preferred: true },
  { selector: ".article-cont", preferred: true },
  { selector: ".tt-article-useless-p-margin", preferred: false },
  { selector: ".inner-content", preferred: false },
] as const satisfies readonly ArticleSelector[];

const articleSelectorEntries = BASE_TISTORY_ARTICLE_SELECTORS_KEBAB.flatMap(
  ({ selector, preferred }) =>
    getSelectorVariants(selector, ["snake"]).map(
      (variant) => [variant, { selector: variant, preferred }] as const,
    ),
);

export const TISTORY_ARTICLE_SELECTORS: readonly ArticleSelector[] = [
  ...new Map(articleSelectorEntries).values(),
];

function getArticleSelectors(): readonly ArticleSelector[] {
  const overrides = getArticleSelectorOverrides();
  if (overrides.length === 0) return TISTORY_ARTICLE_SELECTORS;

  return [
    ...overrides.map((selector) => ({
      selector,
      preferred: true,
    })),
    ...TISTORY_ARTICLE_SELECTORS.filter(
      ({ selector }) => !overrides.includes(selector),
    ),
  ];
}

function hasEnoughText(element: Element, min = 80): boolean {
  const text = (element.textContent || "").replace(/\s+/g, "");
  return text.length >= min;
}

function hasContentSignals(element: Element): boolean {
  return Boolean(
    element.querySelector("p, img, pre, code, blockquote, table, ul, ol"),
  );
}

function isFallbackArticle(element: Element): boolean {
  return hasEnoughText(element, 200) && hasContentSignals(element);
}

export function getTistoryArticle(
  root: ParentNode = document,
): HTMLElement | null {
  for (const { selector, preferred } of getArticleSelectors()) {
    const element = root.querySelector(selector);

    if (!(element instanceof HTMLElement)) continue;
    if (preferred || isFallbackArticle(element)) return element;
  }

  return null;
}

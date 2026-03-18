import { getArticleSelectorOverrides } from "@/shared/plugin-config";

type ArticleSelector = {
  selector: string;
  preferred: boolean;
};

export const TISTORY_ARTICLE_SELECTORS: readonly ArticleSelector[] = [
  { selector: ".contents_style", preferred: true },
  { selector: ".entry-content", preferred: true },
  { selector: ".area_view", preferred: true },
  { selector: ".post-content", preferred: true },
  { selector: ".article_view", preferred: true },
  { selector: ".article-view", preferred: true },
  { selector: "#article", preferred: true },
  { selector: ".article_cont", preferred: true },
  { selector: ".tt_article_useless_p_margin", preferred: false },
  { selector: ".inner_content", preferred: false },
] as const;

function getArticleSelectors(): readonly ArticleSelector[] {
  const overrides = getArticleSelectorOverrides();
  if (overrides.length === 0) {
    return TISTORY_ARTICLE_SELECTORS;
  }

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
  return !!element.querySelector(
    "p, img, pre, code, blockquote, table, ul, ol",
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
    if (!element) continue;
    if (!(element instanceof HTMLElement)) continue;

    if (preferred) return element;
    if (isFallbackArticle(element)) return element;
  }

  return null;
}

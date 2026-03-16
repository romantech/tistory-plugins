export const TISTORY_ARTICLE_SELECTORS = [
  "#article",
  ".article-view",
  ".tt_article_useless_p_margin",
] as const;

export function getFirstMatchedElement(
  selectors: readonly string[],
  root: ParentNode = document,
): Element | null {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) return element;
  }
  return null;
}

export function getTistoryArticle(root: ParentNode = document): Element | null {
  return getFirstMatchedElement(TISTORY_ARTICLE_SELECTORS, root);
}

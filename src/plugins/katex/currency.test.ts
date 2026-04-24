import { describe, expect, it } from "vitest";
import { PROTECTED_CURRENCY_CLASS, protectInlineCurrency } from "./currency";

function createArticle(html: string): HTMLElement {
  const article = document.createElement("article");
  article.innerHTML = html;
  return article;
}

function getProtectedCurrencyTexts(article: HTMLElement): string[] {
  return Array.from(
    article.querySelectorAll<HTMLSpanElement>(`.${PROTECTED_CURRENCY_CLASS}`),
  ).map((element) => element.textContent ?? "");
}

describe("katex currency protection", () => {
  it("protects price-like dollar prefixes", () => {
    const article = createArticle(
      "<p>Prices: $14, $12.99, $1,299 and math $x$</p>",
    );

    protectInlineCurrency(article, [], [PROTECTED_CURRENCY_CLASS]);

    expect(article).toHaveTextContent(
      "Prices: $14, $12.99, $1,299 and math $x$",
    );
    expect(getProtectedCurrencyTexts(article)).toEqual([
      "$14",
      "$12.99",
      "$1,299",
    ]);
  });

  it("leaves numeric inline math with closing delimiters untouched", () => {
    const article = createArticle("<p>Math: $14$ and $2 + 2$</p>");

    protectInlineCurrency(article, [], [PROTECTED_CURRENCY_CLASS]);

    expect(getProtectedCurrencyTexts(article)).toEqual([]);
    expect(article).toHaveTextContent("Math: $14$ and $2 + 2$");
  });

  it("skips ignored tags and classes", () => {
    const article = createArticle(
      '<pre>$14</pre><p><span class="skip">$12</span> Price: $20</p>',
    );

    protectInlineCurrency(article, ["pre"], [PROTECTED_CURRENCY_CLASS, "skip"]);

    expect(getProtectedCurrencyTexts(article)).toEqual(["$20"]);
  });
});

import { getRequiredElement, renderArticleView, setBodyHtml } from "@test/dom";
import { createPluginLoader, loadPlugin } from "@test/load-plugin";
import { describe, expect, it, vi } from "vitest";

function collectRenderableTextRuns(
  element: HTMLElement,
  options: {
    ignoredClasses?: string[];
    ignoredTags?: string[];
  } = {},
): string[] {
  const ignoredTags = new Set(
    (options.ignoredTags ?? []).map((tag) => tag.toLowerCase()),
  );
  const ignoredClasses = options.ignoredClasses ?? [];
  const textRuns: string[] = [];

  const visit = (root: HTMLElement): void => {
    for (let index = 0; index < root.childNodes.length; index += 1) {
      const childNode = root.childNodes[index];

      if (childNode.nodeType === Node.TEXT_NODE) {
        let textContentConcat = childNode.textContent ?? "";
        let sibling = childNode.nextSibling;

        while (sibling?.nodeType === Node.TEXT_NODE) {
          textContentConcat += sibling.textContent ?? "";
          sibling = sibling.nextSibling;
          index += 1;
        }

        textRuns.push(textContentConcat);
        continue;
      }

      if (!(childNode instanceof HTMLElement)) continue;

      const shouldIgnore =
        ignoredTags.has(childNode.tagName.toLowerCase()) ||
        ignoredClasses.some((className) =>
          childNode.classList.contains(className),
        );

      if (!shouldIgnore) {
        visit(childNode);
      }
    }
  };

  visit(element);

  return textRuns;
}

describe("katex plugin", () => {
  const loadKatexPlugin = createPluginLoader(() => import("@/plugins/katex"), {
    microtaskCount: 2,
  });

  it("injects the stylesheet and renders math inside the detected article container", async () => {
    const renderMathInElement = vi.fn();

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView("<p>Euler: $e^{i\\pi}+1=0$</p>");

    await loadKatexPlugin();

    const stylesheet = getRequiredElement(
      document.head,
      "#tistory-plugins-katex-css",
      HTMLLinkElement,
    );

    expect(article).toBeInTheDocument();
    expect(stylesheet).toHaveAttribute("rel", "stylesheet");
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
    expect(renderMathInElement).toHaveBeenCalledWith(
      article,
      expect.objectContaining({
        throwOnError: false,
        strict: false,
      }),
    );
    expect(article).toHaveAttribute("data-katex-rendered", "true");
  });

  it("uses configured render options", async () => {
    const renderMathInElement = vi.fn();

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      katex: {
        delimiters: [{ left: "\\(", right: "\\)", display: false }],
        ignoredTags: ["pre"],
        strict: true,
        throwOnError: true,
      },
    };

    const article = renderArticleView("<p>Euler: \\(e^{i\\pi}+1=0\\)</p>");

    await loadKatexPlugin();

    expect(article).toHaveAttribute("data-katex-rendered", "true");
    expect(renderMathInElement).toHaveBeenCalledWith(
      article,
      expect.objectContaining({
        delimiters: [{ left: "\\(", right: "\\)", display: false }],
        ignoredTags: ["pre"],
        strict: true,
        throwOnError: true,
      }),
    );
  });

  it("normalizes ignoredTags before the currency protection pre-pass", async () => {
    const renderMathInElement = vi.fn();

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      katex: {
        ignoredTags: [" PRE ", "CODE"],
      },
    };

    const article = renderArticleView(
      "<pre>$14 should stay literal</pre><p>Price: $14</p>",
    );

    await loadKatexPlugin();

    const pre = getRequiredElement(article, "pre", HTMLPreElement);
    const paragraph = getRequiredElement(article, "p", HTMLParagraphElement);

    expect(pre.querySelector(".tistory-plugins-katex-currency")).toBeNull();
    expect(
      paragraph.querySelector(".tistory-plugins-katex-currency"),
    )?.toHaveTextContent("$14");
    expect(renderMathInElement).toHaveBeenCalledWith(
      article,
      expect.objectContaining({
        ignoredTags: ["pre", "code"],
      }),
    );
  });

  it("shields currency-like dollar prefixes from KaTeX auto-render", async () => {
    let capturedTextRuns: string[] = [];
    const renderMathInElement = vi.fn(
      (
        element: Element,
        options?: {
          ignoredClasses?: string[];
          ignoredTags?: string[];
        },
      ) => {
        const paragraph = getRequiredElement(
          element,
          "p",
          HTMLParagraphElement,
        );
        capturedTextRuns = collectRenderableTextRuns(paragraph, options);
      },
    );

    const protectedCurrencySelector = ".tistory-plugins-katex-currency";

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView(
      "<p>Prices: $14, $12.99, $1,299, $ 99 and math $x$</p>",
    );

    await loadKatexPlugin();

    const paragraph = getRequiredElement(article, "p", HTMLParagraphElement);
    const protectedCurrencies = Array.from(
      paragraph.querySelectorAll<HTMLSpanElement>(protectedCurrencySelector),
    );

    expect(article).toHaveTextContent(
      "Prices: $14, $12.99, $1,299, $ 99 and math $x$",
    );
    expect(protectedCurrencies.map((element) => element.textContent)).toEqual([
      "$14",
      "$12.99",
      "$1,299",
      "$ 99",
    ]);
    expect(capturedTextRuns).toEqual([
      "Prices: ",
      ", ",
      ", ",
      ", ",
      " and math $x$",
    ]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
    expect(renderMathInElement).toHaveBeenCalledWith(
      article,
      expect.objectContaining({
        ignoredClasses: ["tistory-plugins-katex-currency"],
      }),
    );
  });

  it("keeps numeric inline math when it has a closing delimiter", async () => {
    let capturedTextRuns: string[] = [];
    const renderMathInElement = vi.fn(
      (
        element: Element,
        options?: {
          ignoredClasses?: string[];
          ignoredTags?: string[];
        },
      ) => {
        const paragraph = getRequiredElement(
          element,
          "p",
          HTMLParagraphElement,
        );
        capturedTextRuns = collectRenderableTextRuns(paragraph, options);
      },
    );

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView("<p>Math stays inline: $14$ and $x$</p>");

    await loadKatexPlugin();

    expect(article.querySelector(".tistory-plugins-katex-currency")).toBeNull();
    expect(capturedTextRuns).toEqual(["Math stays inline: $14$ and $x$"]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
  });

  it("does not shield numeric inline math openers with operators", async () => {
    let capturedTextRuns: string[] = [];
    const renderMathInElement = vi.fn(
      (
        element: Element,
        options?: {
          ignoredClasses?: string[];
          ignoredTags?: string[];
        },
      ) => {
        const paragraph = getRequiredElement(
          element,
          "p",
          HTMLParagraphElement,
        );
        capturedTextRuns = collectRenderableTextRuns(paragraph, options);
      },
    );

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView(
      "<p>Math stays inline: $2 + 2$ and $14 + x$</p>",
    );

    await loadKatexPlugin();

    expect(article.querySelector(".tistory-plugins-katex-currency")).toBeNull();
    expect(capturedTextRuns).toEqual([
      "Math stays inline: $2 + 2$ and $14 + x$",
    ]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
  });

  it("keeps comma-separated numeric inline math when it has a closing delimiter", async () => {
    let capturedTextRuns: string[] = [];
    const renderMathInElement = vi.fn(
      (
        element: Element,
        options?: {
          ignoredClasses?: string[];
          ignoredTags?: string[];
        },
      ) => {
        const paragraph = getRequiredElement(
          element,
          "p",
          HTMLParagraphElement,
        );
        capturedTextRuns = collectRenderableTextRuns(paragraph, options);
      },
    );

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView(
      "<p>Math stays inline: $1, 2$ and $1, 2, 3$</p>",
    );

    await loadKatexPlugin();

    expect(article.querySelector(".tistory-plugins-katex-currency")).toBeNull();
    expect(capturedTextRuns).toEqual([
      "Math stays inline: $1, 2$ and $1, 2, 3$",
    ]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
  });

  it("does not shield closing inline-math delimiters followed by digits", async () => {
    let capturedTextRuns: string[] = [];
    const renderMathInElement = vi.fn(
      (
        element: Element,
        options?: {
          ignoredClasses?: string[];
          ignoredTags?: string[];
        },
      ) => {
        const paragraph = getRequiredElement(
          element,
          "p",
          HTMLParagraphElement,
        );
        capturedTextRuns = collectRenderableTextRuns(paragraph, options);
      },
    );

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView(
      "<p>Math stays inline: $x$2, $14$15, $x$ 99, $x + 1$2, $x + 1$ 99, and $2x$</p>",
    );

    await loadKatexPlugin();

    expect(article.querySelector(".tistory-plugins-katex-currency")).toBeNull();
    expect(capturedTextRuns).toEqual([
      "Math stays inline: $x$2, $14$15, $x$ 99, $x + 1$2, $x + 1$ 99, and $2x$",
    ]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
  });

  it("still shields currency after an unmatched non-math dollar", async () => {
    const renderMathInElement = vi.fn();

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    const article = renderArticleView("<p>literal $x and price $14</p>");

    await loadKatexPlugin();

    const protectedCurrencies = Array.from(
      article.querySelectorAll<HTMLSpanElement>(
        ".tistory-plugins-katex-currency",
      ),
    );

    expect(protectedCurrencies.map((element) => element.textContent)).toEqual([
      "$14",
    ]);
    expect(renderMathInElement).toHaveBeenCalledTimes(1);
  });

  it("reselects the article after async asset loading", async () => {
    let resolveAssets!: () => void;

    vi.stubGlobal("katex", {});
    vi.stubGlobal(
      "__tistoryPluginsKatexLoadPromise",
      new Promise<void>((resolve) => {
        resolveAssets = resolve;
      }),
    );

    const renderMathInElement = vi.fn();

    setBodyHtml(
      '<div class="tt_article_useless_p_margin contents_style"><p>Transient $x$</p></div>',
    );

    const pluginLoad = loadPlugin(() => import("@/plugins/katex"), 0);

    setBodyHtml('<div id="article"><p>Stable $e^{i\\pi}+1=0$</p></div>');
    const article = getRequiredElement(document, "#article", HTMLElement);

    vi.stubGlobal("renderMathInElement", renderMathInElement);
    resolveAssets();

    await pluginLoad;
    await Promise.resolve();

    expect(renderMathInElement).toHaveBeenCalledTimes(1);
    expect(renderMathInElement).toHaveBeenCalledWith(
      article,
      expect.objectContaining({
        throwOnError: false,
        strict: false,
      }),
    );
    expect(article).toHaveAttribute("data-katex-rendered", "true");
  });
});

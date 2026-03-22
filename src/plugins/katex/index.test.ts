import { getRequiredElement, renderArticleView, setBodyHtml } from "@test/dom";
import { createPluginLoader, loadPlugin } from "@test/load-plugin";
import { describe, expect, it, vi } from "vitest";

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

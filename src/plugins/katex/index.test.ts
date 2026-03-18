import { getRequiredElement, renderArticleView } from "@test/dom";
import { loadPlugin } from "@test/load-plugin";
import { describe, expect, it, vi } from "vitest";

describe("katex plugin", () => {
  const loadKatexPlugin = () => loadPlugin(() => import("@/plugins/katex"), 2);

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
});

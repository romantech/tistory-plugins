import { loadPlugin } from "@test/load-plugin";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("katex plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("injects the stylesheet and renders math inside the detected article container", async () => {
    const renderMathInElement = vi.fn();

    vi.stubGlobal("katex", {});
    vi.stubGlobal("renderMathInElement", renderMathInElement);

    document.body.innerHTML =
      '<div class="article-view"><p>Euler: $e^{i\\pi}+1=0$</p></div>';

    await loadPlugin(() => import("@/plugins/katex"), 2);

    const article = document.querySelector(".article-view");
    const stylesheet = document.head.querySelector<HTMLLinkElement>(
      "#tistory-plugins-katex-css",
    );

    expect(article).toBeInTheDocument();
    expect(stylesheet).toBeInstanceOf(HTMLLinkElement);
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

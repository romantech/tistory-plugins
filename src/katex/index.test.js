import { screen } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { loadPlugin } from "../../test/load-plugin.js";

describe("katex plugin", () => {
  it("renders math inside the detected article container", async () => {
    const renderMathInElement = vi.fn();
    const appendChild = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation((node) => {
        if (node instanceof HTMLLinkElement) {
          return node;
        }

        return Node.prototype.appendChild.call(document.head, node);
      });

    globalThis.katex = {};
    globalThis.renderMathInElement = renderMathInElement;
    document.body.innerHTML =
      '<div class="article-view"><p>Euler: $e^{i\\pi}+1=0$</p></div>';

    await loadPlugin(() => import("./index.ts"), 2);

    const article = screen.getByText(/Euler:/).closest(".article-view");
    const stylesheet = appendChild.mock.calls.find(
      ([node]) => node instanceof HTMLLinkElement,
    )?.[0];

    expect(article).toBeInTheDocument();
    expect(stylesheet).toBeInstanceOf(HTMLLinkElement);
    expect(stylesheet).toHaveAttribute("id", "tistory-plugins-katex-css");
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

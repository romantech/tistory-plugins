import { appendPluginScript, renderArticle, setBodyHtml } from "@test/dom";
import { createPluginLoader, loadPlugin } from "@test/load-plugin";
import { waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mermaid plugin", () => {
  const loadMermaid = createPluginLoader(() => import("@/plugins/mermaid"), {
    microtaskCount: 4,
  });
  const mount = vi.fn((container: HTMLElement, _source: string) => {
    container.innerHTML = '<svg class="pele" role="img"></svg>';
    return { destroy: vi.fn(), error: undefined as unknown };
  });

  beforeEach(() => {
    mount.mockClear();
    appendPluginScript("mermaid");
    vi.stubGlobal("pele", { mount });
    const append = document.head.append.bind(document.head);
    vi.spyOn(document.head, "append").mockImplementation((...nodes) => {
      for (const node of nodes) {
        if (node instanceof HTMLScriptElement && node.src.includes("pele@")) {
          node.type = "text/plain";
        }
      }
      append(...nodes);
    });
  });

  it.each([
    '<div class="mermaid">flowchart LR\n  A --&gt; B</div>',
    '<pre class="mermaid">flowchart LR\n  A --&gt; B</pre>',
    '<pre data-ke-language="mermaid">flowchart LR\n  A --&gt; B</pre>',
    '<pre data-ke-language="mermaid"><code>flowchart LR\n  A --&gt; B</code></pre>',
    '<pre><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre>',
    '<pre><code class="lang-mermaid">flowchart LR\n  A --&gt; B</code></pre>',
    '<pre><code class="mermaid">flowchart LR\n  A --&gt; B</code></pre>',
  ])("renders supported markup: %s", async (markup) => {
    const article = renderArticle(markup);

    await loadMermaid();

    expect(mount).toHaveBeenCalledExactlyOnceWith(
      expect.any(HTMLElement),
      "flowchart LR\n  A --> B",
      { zoom: false },
    );
    expect(article.querySelectorAll(".rp-mermaid > svg")).toHaveLength(1);
    expect(article.querySelector("pre")).toBeNull();
    expect(document.querySelectorAll('script[src*="pele@"]')).toHaveLength(0);
    expect(
      document.querySelector("#tistory-plugins-mermaid-css"),
    ).toHaveAttribute(
      "href",
      "https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/mermaid/index.min.css",
    );
  });

  it("preserves source whitespace, strips highlight spans and ignores copy controls", async () => {
    const article = renderArticle(
      '<pre id="diagram" data-ke-language="mermaid"><code><span>flowchart LR</span>\n  A[시작] --&gt; B\n</code><button>Copy</button><span>MERMAID</span></pre>',
    );

    await loadMermaid();

    expect(mount.mock.calls[0][1]).toBe("flowchart LR\n  A[시작] --> B\n");
    expect(article.querySelector("#diagram")).toHaveClass("rp-mermaid");
    expect(article.querySelector("button")).toBeNull();
  });

  it("deduplicates nested markers and repeated initialization", async () => {
    const article = renderArticle(
      '<div class="mermaid"><pre class="mermaid" data-ke-language="mermaid"><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre></div>',
    );

    await loadMermaid();
    await loadMermaid();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(article.querySelectorAll("svg")).toHaveLength(1);
    expect(article.querySelector(".rp-mermaid")).toHaveAttribute(
      "data-mermaid-state",
      "ready",
    );
  });

  it.each([
    '<div class="mermaid">flowchart LR\n A --&gt; B</div>',
    '<div id="article"><pre><code>const x = 1;</code></pre></div>',
    '<div id="article"><pre class="mermaid"> \n </pre></div>',
  ])(
    "does nothing without nonempty diagrams in an article: %s",
    async (markup) => {
      setBodyHtml(markup);

      await loadMermaid();

      expect(mount).not.toHaveBeenCalled();
      expect(document.querySelector("#tistory-plugins-mermaid-css")).toBeNull();
      expect(document.querySelector('script[src*="pele@"]')).toBeNull();
      expect(document.querySelector("[data-mermaid-state]")).toBeNull();
    },
  );

  it("honors custom article selectors and an explicit theme", async () => {
    vi.stubGlobal("RPPlugins", {
      articleSelectors: [".custom-article"],
      mermaid: { theme: "dark" },
    });
    setBodyHtml(
      '<div class="custom-article"><div class="mermaid">flowchart LR\n A --&gt; B</div></div><div class="mermaid">outside</div>',
    );

    await loadMermaid();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".rp-mermaid")).toHaveAttribute(
      "data-mermaid-theme",
      "dark",
    );
    expect(document.querySelector(".mermaid")).toHaveTextContent("outside");
  });

  it.each(["auto", "invalid"])(
    "leaves theme selection to CSS for %s",
    async (theme) => {
      vi.stubGlobal("RPPlugins", { mermaid: { theme } });
      const article = renderArticle(
        '<div class="mermaid">flowchart LR\n A --&gt; B</div>',
      );

      await loadMermaid();

      expect(article.querySelector(".rp-mermaid")).not.toHaveAttribute(
        "data-mermaid-theme",
      );
    },
  );

  it("preserves a failed diagram and continues rendering the others", async () => {
    const article = renderArticle(
      '<pre class="mermaid"><code>invalid &lt;img onerror=alert(1)&gt;</code></pre><div class="mermaid">flowchart LR\n A --&gt; B</div>',
    );
    const original = article.querySelector("pre");
    const destroy = vi.fn();
    mount.mockImplementationOnce((container) => {
      container.textContent = "parse error";
      return { destroy, error: new Error("invalid diagram") };
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await loadMermaid();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(article.querySelector("pre")).toBe(original);
    expect(original?.textContent).toBe("invalid <img onerror=alert(1)>");
    expect(original).not.toHaveAttribute("data-mermaid-state");
    expect(article.querySelector("img")).toBeNull();
    expect(article.querySelectorAll(".rp-mermaid > svg")).toHaveLength(1);
  });

  it("keeps the original DOM when mount throws", async () => {
    const article = renderArticle('<div class="mermaid">invalid</div>');
    const original = article.firstElementChild;
    mount.mockImplementationOnce(() => {
      throw new Error("render failed");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await loadMermaid();

    expect(article.firstElementChild).toBe(original);
    expect(article.querySelector(".rp-mermaid")).toBeNull();
    expect(original).not.toHaveAttribute("data-mermaid-state");
  });

  it("shares one CDN request while initialization is pending", async () => {
    vi.stubGlobal("pele", undefined);
    const article = renderArticle(
      '<pre class="mermaid">flowchart LR\n A --&gt; B</pre>',
    );
    await loadMermaid();
    await loadMermaid();
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[src*="pele@"]',
    );
    expect(scripts).toHaveLength(1);
    expect(article.querySelector("pre")).toHaveAttribute(
      "data-mermaid-state",
      "loading",
    );
    vi.stubGlobal("pele", { mount });

    scripts[0].dispatchEvent(new Event("load"));

    await waitFor(() => expect(mount).toHaveBeenCalledTimes(1));
    expect(article.querySelectorAll("svg")).toHaveLength(1);
  });

  it.each(["error", "load"])(
    "keeps source and allows retry after CDN %s failure",
    async (event) => {
      vi.stubGlobal("pele", undefined);
      const article = renderArticle(
        '<pre class="mermaid">flowchart LR\n A --&gt; B</pre>',
      );
      vi.spyOn(console, "error").mockImplementation(() => {});
      await loadMermaid();
      const script = document.querySelector('script[src*="pele@"]');

      script?.dispatchEvent(new Event(event));

      await waitFor(() =>
        expect(article.querySelector("pre")).not.toHaveAttribute(
          "data-mermaid-state",
        ),
      );
      expect(article.querySelector("pre")?.textContent).toBe(
        "flowchart LR\n A --> B",
      );
      expect(script).not.toBeInTheDocument();
      vi.stubGlobal("pele", { mount });
      await loadMermaid();
      expect(article.querySelectorAll("svg")).toHaveLength(1);
    },
  );

  it("times out a stalled CDN request without losing source", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("pele", undefined);
    const article = renderArticle(
      '<pre class="mermaid">flowchart LR\n A --&gt; B</pre>',
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await loadMermaid();

    await vi.advanceTimersByTimeAsync(15_000);

    expect(article.querySelector("pre")?.textContent).toBe(
      "flowchart LR\n A --> B",
    );
    expect(article.querySelector("pre")).not.toHaveAttribute(
      "data-mermaid-state",
    );
    expect(document.querySelector('script[src*="pele@"]')).toBeNull();
  });

  it("does not render targets removed during loading", async () => {
    vi.stubGlobal("pele", undefined);
    const article = renderArticle(
      '<pre class="mermaid">flowchart LR\n A --&gt; B</pre>',
    );
    await loadMermaid();
    article.replaceChildren();
    vi.stubGlobal("pele", { mount });
    document
      .querySelector('script[src*="pele@"]')
      ?.dispatchEvent(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();

    expect(mount).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "works with copy-code in either load order (mermaid first: %s)",
    async (mermaidFirst) => {
      const article = renderArticle(
        '<pre><code class="language-mermaid">flowchart LR\n A --&gt; B</code></pre><pre><code>const a = 1;</code></pre>',
      );
      appendPluginScript("copy-code");
      const loadCopyCode = () =>
        loadPlugin(() => import("@/plugins/copy-code"));

      if (mermaidFirst) {
        await loadMermaid();
        await loadCopyCode();
      } else {
        await loadCopyCode();
        await loadMermaid();
      }

      expect(article.querySelectorAll(".rp-copy-code-button")).toHaveLength(1);
      expect(article.querySelectorAll(".rp-mermaid > svg")).toHaveLength(1);
      expect(article.querySelector(".rp-mermaid button")).toBeNull();
    },
  );
});

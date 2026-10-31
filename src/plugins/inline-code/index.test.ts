import { getRequiredElement, renderArticle } from "@test/dom";
import { createPluginLoader } from "@test/load-plugin";
import { screen } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";

describe("inline-code plugin", () => {
  const loadInlineCodePlugin = createPluginLoader(
    () => import("@/plugins/inline-code"),
  );

  it("wraps backtick-delimited text in code tags", async () => {
    const article = renderArticle("<p>Use `const x = 1` in the post.</p>");

    await loadInlineCodePlugin();

    const code = screen.getByText("const x = 1", { selector: "code" });
    const paragraph = getRequiredElement(article, "p", HTMLParagraphElement);
    const codes = article.querySelectorAll("p code");

    expect(codes).toHaveLength(1);
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("const x = 1");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent("Use const x = 1 in the post.");
  });

  it("wraps multiple backtick-delimited segments in one text node", async () => {
    const article = renderArticle(
      "<p>Use `const x = 1` and `const y = 2`.</p>",
    );

    await loadInlineCodePlugin();

    const codes = article.querySelectorAll("p code");

    expect(codes).toHaveLength(2);
    expect(codes[0]).toHaveTextContent("const x = 1");
    expect(codes[1]).toHaveTextContent("const y = 2");
    expect(
      getRequiredElement(article, "p", HTMLParagraphElement),
    ).toHaveTextContent("Use const x = 1 and const y = 2.");
  });

  it("does not wrap text inside pre or code elements", async () => {
    const article = renderArticle(
      [
        "<p>Use `inline` here.</p>",
        "<pre><code>const x = `not wrapped`;</code></pre>",
      ].join(""),
    );

    await loadInlineCodePlugin();

    const inlineCode = screen.getByText("inline", { selector: "p code" });
    const preCode = getRequiredElement(article, "pre code", HTMLElement);

    expect(inlineCode).toBeInTheDocument();
    expect(preCode).toHaveTextContent("const x = `not wrapped`;");
    expect(preCode.querySelector("code")).toBeNull();
  });

  it("does not wrap text outside target elements", async () => {
    const article = renderArticle("<div>Use `const x = 1` in div.</div>");

    await loadInlineCodePlugin();

    expect(article.querySelector("div code")).toBeNull();
    expect(
      getRequiredElement(article, "div", HTMLDivElement),
    ).toHaveTextContent("Use `const x = 1` in div.");
  });

  it("leaves Mermaid sources and rendered labels untouched", async () => {
    const article = renderArticle(
      '<p class="mermaid">flowchart LR\n A["`label`"] --> B</p><div class="rp-mermaid"><svg><text>`label`</text></svg></div><p>`inline`</p>',
    );
    vi.stubGlobal("RPPlugins", { inlineCode: { targetSelector: "*" } });

    await loadInlineCodePlugin();

    expect(article.querySelectorAll("code")).toHaveLength(1);
    expect(article.querySelector("code")).toHaveTextContent("inline");
    expect(article.querySelector(".mermaid")?.textContent).toContain(
      'A["`label`"]',
    );
    expect(article.querySelector("text")?.textContent).toBe("`label`");
  });

  it("does not wrap backtick-delimited text containing line breaks", async () => {
    const article = renderArticle("<p>`foo\nbar`</p>");

    await loadInlineCodePlugin();

    const paragraph = getRequiredElement(article, "p", HTMLParagraphElement);

    expect(article.querySelector("p code")).toBeNull();
    expect(paragraph).toHaveTextContent("`foo\nbar`", {
      normalizeWhitespace: false,
    });
  });

  it("uses a configured target selector", async () => {
    const article = renderArticle("<div>Use `const x = 1` in div.</div>");

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      inlineCode: {
        targetSelector: "div",
      },
    };

    await loadInlineCodePlugin();

    const code = getRequiredElement(article, "div code", HTMLElement);
    expect(code).toHaveTextContent("const x = 1");
  });
});

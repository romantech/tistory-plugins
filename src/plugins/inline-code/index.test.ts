import { screen } from "@testing-library/dom";
import { beforeEach, describe, expect, it } from "vitest";
import { loadPlugin } from "@/test/load-plugin";

describe("inline-code plugin", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("wraps backtick-delimited text in code tags", async () => {
    document.body.innerHTML =
      '<div id="article"><p>Use `const x = 1` in the post.</p></div>';

    await loadPlugin(() => import("@/plugins/inline-code"));

    const code = screen.getByText("const x = 1", { selector: "code" });
    const paragraph = code.closest("p");
    const codes = document.querySelectorAll("#article p code");

    expect(codes).toHaveLength(1);
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("const x = 1");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent("Use const x = 1 in the post.");
  });

  it("wraps multiple backtick-delimited segments in one text node", async () => {
    document.body.innerHTML =
      '<div id="article"><p>Use `const x = 1` and `const y = 2`.</p></div>';

    await loadPlugin(() => import("@/plugins/inline-code"));

    const codes = document.querySelectorAll("#article p code");

    expect(codes).toHaveLength(2);
    expect(codes[0]).toHaveTextContent("const x = 1");
    expect(codes[1]).toHaveTextContent("const y = 2");
    expect(document.querySelector("#article p")).toHaveTextContent(
      "Use const x = 1 and const y = 2.",
    );
  });

  it("does not wrap text inside pre or code elements", async () => {
    document.body.innerHTML = [
      '<div id="article">',
      "<p>Use `inline` here.</p>",
      "<pre><code>const x = `not wrapped`;</code></pre>",
      "</div>",
    ].join("");

    await loadPlugin(() => import("@/plugins/inline-code"));

    const inlineCode = screen.getByText("inline", { selector: "p code" });
    const preCode = document.querySelector("pre code");

    expect(inlineCode).toBeInTheDocument();
    expect(preCode).toHaveTextContent("const x = `not wrapped`;");
    expect(preCode?.querySelector("code")).toBeNull();
  });

  it("does not wrap text outside target elements", async () => {
    document.body.innerHTML =
      '<div id="article"><div>Use `const x = 1` in div.</div></div>';

    await loadPlugin(() => import("@/plugins/inline-code"));

    expect(document.querySelector("#article div code")).toBeNull();
    expect(document.querySelector("#article div")).toHaveTextContent(
      "Use `const x = 1` in div.",
    );
  });

  it("does not wrap backtick-delimited text containing line breaks", async () => {
    document.body.innerHTML = '<div id="article"><p>`foo\nbar`</p></div>';

    await loadPlugin(() => import("@/plugins/inline-code"));

    const paragraph = document.querySelector("#article p");

    expect(document.querySelector("#article p code")).toBeNull();
    expect(paragraph).not.toBeNull();
    expect(paragraph).toHaveTextContent("`foo\nbar`", {
      normalizeWhitespace: false,
    });
  });
});

import { loadPlugin } from "@test/load-plugin";
import { screen } from "@testing-library/dom";
import { describe, expect, it } from "vitest";

describe("inline-code plugin", () => {
  it("wraps backtick-delimited text in code tags", async () => {
    document.body.innerHTML =
      '<div id="article"><p>Use `const x = 1` in the post.</p></div>';

    await loadPlugin(() => import("./index.ts"));

    const code = screen.getByText("const x = 1", { selector: "code" });
    const paragraph = code.closest("p");

    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("const x = 1");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent("Use const x = 1 in the post.");
  });
});

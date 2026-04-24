import { describe, expect, it } from "vitest";
import { getLanguageLabel } from "./language";

function createCodeBlock(options: {
  codeClass?: string;
  preAttributes?: Record<string, string>;
  preClass?: string;
}): HTMLElement {
  const pre = document.createElement("pre");
  const code = document.createElement("code");

  if (options.preClass) {
    pre.className = options.preClass;
  }

  for (const [name, value] of Object.entries(options.preAttributes ?? {})) {
    pre.setAttribute(name, value);
  }

  if (options.codeClass) {
    code.className = options.codeClass;
  }

  pre.append(code);
  return pre;
}

describe("copy-code language labels", () => {
  it("returns the default label when no language metadata exists", () => {
    expect(getLanguageLabel(createCodeBlock({}))).toBe("Code");
  });

  it("formats known language attributes", () => {
    expect(
      getLanguageLabel(
        createCodeBlock({
          preAttributes: {
            "data-ke-language": "javascript",
          },
        }),
      ),
    ).toBe("JS");
  });

  it("detects language-prefixed code classes", () => {
    expect(
      getLanguageLabel(
        createCodeBlock({
          codeClass: "hljs language-typescript",
        }),
      ),
    ).toBe("TS");
  });

  it("formats unknown attribute tokens conservatively", () => {
    expect(
      getLanguageLabel(
        createCodeBlock({
          preAttributes: {
            "data-language": "mermaid-flowchart",
          },
        }),
      ),
    ).toBe("MERM-FLOW");
  });
});

import {fireEvent, screen, waitFor} from "@testing-library/dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {loadPlugin} from "../../test/load-plugin.js";

describe("copy-code plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    document.head.innerHTML = "";
    document.body.innerHTML = "";

    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    document.execCommand = vi.fn(() => true);
  });

  it("adds copy buttons to code blocks in the article", async () => {
    document.body.innerHTML = `
      <div id="article">
        <pre><code>const a = 1;</code></pre>
        <pre><code>const b = 2;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const buttons = screen.getAllByRole("button", { name: "코드 복사" });
    const wrappers = document.querySelectorAll(".rp-copy-code-wrapper");

    expect(buttons).toHaveLength(2);
    expect(wrappers).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("복사");
    expect(buttons[1]).toHaveTextContent("복사");
  });

  it("does not add a button when pre does not contain code", async () => {
    document.body.innerHTML = `
      <div id="article">
        <pre>plain text</pre>
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const buttons = screen.getAllByRole("button", { name: "코드 복사" });
    expect(buttons).toHaveLength(1);
  });

  it("injects the style element only once", async () => {
    document.body.innerHTML = `
      <div id="article">
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));
    await loadPlugin(() => import("./index.ts"));

    const styles = document.querySelectorAll("#rp-copy-code-style");
    expect(styles).toHaveLength(1);
  });

  it("copies code text with Clipboard API and shows success state", async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <div id="article">
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });

    await fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "const a = 1;",
      );
      expect(button).toHaveTextContent("복사됨");
      expect(button).toHaveClass("is-copied");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("복사");
    });

    expect(button).not.toHaveClass("is-copied");
  });

  it("shows error state when code block is empty", async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <div id="article">
        <pre><code>   </code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });

    await fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(button).toHaveTextContent("실패");
      expect(button).toHaveClass("is-error");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("복사");
    });

    expect(button).not.toHaveClass("is-error");
  });

  it("falls back to execCommand when Clipboard API is unavailable", async () => {
    vi.useFakeTimers();

    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    document.body.innerHTML = `
      <div id="article">
        <pre><code>fallback text</code></pre>
      </div>
    `;

    const execCommandSpy = vi.spyOn(document, "execCommand");

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });

    await fireEvent.click(button);

    await waitFor(() => {
      expect(execCommandSpy).toHaveBeenCalledWith("copy");
      expect(button).toHaveTextContent("복사됨");
      expect(button).toHaveClass("is-copied");
    });
  });

  it("shows error state when clipboard copy fails", async () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("copy failed")),
      },
    });

    document.body.innerHTML = `
      <div id="article">
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });

    await fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("실패");
      expect(button).toHaveClass("is-error");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("복사");
    });
  });

  it("does not add a duplicate button to already processed code blocks", async () => {
    document.body.innerHTML = `
      <div id="article">
        <pre data-copy-code-ready="true"><code>const a = 1;</code></pre>
        <pre><code>const b = 2;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const buttons = screen.getAllByRole("button", { name: "코드 복사" });
    expect(buttons).toHaveLength(1);
  });

  it("works with .article-view container too", async () => {
    document.body.innerHTML = `
      <div class="article-view">
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("복사");
  });

  it("works with .tt_article_useless_p_margin container too", async () => {
    document.body.innerHTML = `
      <div class="tt_article_useless_p_margin">
        <pre><code>const a = 1;</code></pre>
      </div>
    `;

    await loadPlugin(() => import("./index.ts"));

    const button = screen.getByRole("button", { name: "코드 복사" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("복사");
  });
});

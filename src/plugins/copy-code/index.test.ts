import { renderArticle, renderArticleView } from "@test/dom";
import { loadPlugin } from "@test/load-plugin";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("copy-code plugin", () => {
  const loadCopyCodePlugin = () =>
    loadPlugin(() => import("@/plugins/copy-code"));

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

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

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => true),
    });
  });

  it("adds copy buttons to code blocks in the article", async () => {
    renderArticle(`
      <pre><code>const a = 1;</code></pre>
      <pre><code>const b = 2;</code></pre>
    `);

    await loadCopyCodePlugin();

    const buttons = screen.getAllByRole("button", { name: "Copy code" });
    const wrappers = document.querySelectorAll(".rp-copy-code-wrapper");

    expect(buttons).toHaveLength(2);
    expect(wrappers).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Copy");
    expect(buttons[1]).toHaveTextContent("Copy");
  });

  it("does not add a button when pre does not contain code", async () => {
    renderArticle(`
      <pre>plain text</pre>
      <pre><code>const a = 1;</code></pre>
    `);

    await loadCopyCodePlugin();

    const buttons = screen.getAllByRole("button", { name: "Copy code" });
    expect(buttons).toHaveLength(1);
  });

  it("does not add duplicate copy buttons when loaded more than once", async () => {
    renderArticle(`
      <pre><code>const a = 1;</code></pre>
    `);

    await loadCopyCodePlugin();
    await loadCopyCodePlugin();

    const buttons = screen.getAllByRole("button", { name: "Copy code" });
    const wrappers = document.querySelectorAll(".rp-copy-code-wrapper");

    expect(buttons).toHaveLength(1);
    expect(wrappers).toHaveLength(1);
  });

  it("copies code text with Clipboard API and shows success state", async () => {
    vi.useFakeTimers();

    renderArticle(`
      <pre><code>const a = 1;</code></pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "const a = 1;",
      );
      expect(button).toHaveTextContent("Copied");
      expect(button).toHaveClass("is-copied");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("Copy");
    });

    expect(button).not.toHaveClass("is-copied");
  });

  it("shows error state when code block is empty", async () => {
    vi.useFakeTimers();

    renderArticle(`
      <pre><code>   </code></pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(button).toHaveTextContent("Error");
      expect(button).toHaveClass("is-error");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("Copy");
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

    renderArticle(`
      <pre><code>fallback text</code></pre>
    `);

    const execCommandSpy = vi.spyOn(document, "execCommand");

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(execCommandSpy).toHaveBeenCalledWith("copy");
      expect(button).toHaveTextContent("Copied");
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

    renderArticle(`
      <pre><code>const a = 1;</code></pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("Error");
      expect(button).toHaveClass("is-error");
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(button).toHaveTextContent("Copy");
    });
  });

  it("does not add a duplicate button to already processed code blocks", async () => {
    renderArticle(`
      <pre data-copy-code-ready="true"><code>const a = 1;</code></pre>
      <pre><code>const b = 2;</code></pre>
    `);

    await loadCopyCodePlugin();

    const buttons = screen.getAllByRole("button", { name: "Copy code" });
    expect(buttons).toHaveLength(1);
  });

  it("works with .article-view container too", async () => {
    renderArticleView(`
      <pre><code>const a = 1;</code></pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Copy");
  });

  it("preserves line breaks when copying plain code blocks", async () => {
    renderArticle(`
      <pre><code>const a = 1;\nconst b = 2;\nreturn a + b;</code></pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "const a = 1;\nconst b = 2;\nreturn a + b;",
      );
      expect(button).toHaveTextContent("Copied");
    });
  });

  it("preserves line breaks when copying code blocks rendered with highlight.js line numbers", async () => {
    renderArticle(`
      <pre>
        <code>
          <table class="hljs-ln">
            <tbody>
              <tr>
                <td class="hljs-ln-numbers" data-line-number="1"></td>
                <td class="hljs-ln-code"><span class="hljs-ln-line">const a = 1;</span></td>
              </tr>
              <tr>
                <td class="hljs-ln-numbers" data-line-number="2"></td>
                <td class="hljs-ln-code"><span class="hljs-ln-line">const b = 2;</span></td>
              </tr>
              <tr>
                <td class="hljs-ln-numbers" data-line-number="3"></td>
                <td class="hljs-ln-code"><span class="hljs-ln-line">return a + b;</span></td>
              </tr>
            </tbody>
          </table>
        </code>
      </pre>
    `);

    await loadCopyCodePlugin();

    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "const a = 1;\nconst b = 2;\nreturn a + b;",
      );
      expect(button).toHaveTextContent("Copied");
    });
  });
});

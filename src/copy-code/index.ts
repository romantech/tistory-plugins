import "./style.css";

(() => {
  const CONTAINER_SELECTORS = [
    "#article",
    ".article-view",
    ".tt_article_useless_p_margin",
  ] as const;

  const WRAPPER_CLASS = "rp-copy-code-wrapper";
  const BUTTON_CLASS = "rp-copy-code-button";
  const COPIED_CLASS = "is-copied";
  const ERROR_CLASS = "is-error";
  const LINE_TEXT_SELECTORS = [
    ".hljs-ln-code .hljs-ln-line",
    ".hljs-ln-code",
  ] as const;

  const BUTTON_TEXT = "Copy";
  const SUCCESS_TEXT = "Copied";
  const ERROR_TEXT = "Error";
  const RESET_DELAY = 2000;

  function normalizeLineBreaks(text: string): string {
    return text.replace(/\r\n?/g, "\n");
  }

  function getTextBySelectors(
    root: ParentNode,
    selectors: readonly string[],
  ): string | null {
    for (const selector of selectors) {
      const elements = root.querySelectorAll<HTMLElement>(selector);
      if (elements.length === 0) continue;

      return elements.length === 1
        ? (elements[0].textContent ?? "")
        : Array.from(elements)
            .map((element) => element.textContent ?? "")
            .join("\n");
    }

    return null;
  }

  function getArticleContainer(): HTMLElement | null {
    for (const selector of CONTAINER_SELECTORS) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) return element;
    }

    return null;
  }

  function setButtonState(
    button: HTMLButtonElement,
    text: string,
    stateClass?: string,
  ): void {
    button.textContent = text;
    button.classList.remove(COPIED_CLASS, ERROR_CLASS);

    if (stateClass) {
      button.classList.add(stateClass);
    }
  }

  async function copyText(text: string): Promise<void> {
    const normalizedText = normalizeLineBreaks(text);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(normalizedText);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = normalizedText;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const isSuccess = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!isSuccess) {
      throw new Error("Copy command failed.");
    }
  }

  function getCodeText(pre: HTMLElement): string {
    const code = pre.querySelector<HTMLElement>("code");
    if (!code) return "";

    const lineText = getTextBySelectors(code, LINE_TEXT_SELECTORS);
    return normalizeLineBreaks(lineText ?? code.textContent ?? "");
  }

  function createButton(pre: HTMLElement): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = BUTTON_TEXT;
    button.setAttribute("aria-label", "Copy code");

    let resetTimer: number | undefined;

    button.addEventListener("click", async () => {
      const text = getCodeText(pre);

      if (!text.trim()) {
        setButtonState(button, ERROR_TEXT, ERROR_CLASS);
      } else {
        try {
          await copyText(text);
          setButtonState(button, SUCCESS_TEXT, COPIED_CLASS);
        } catch {
          setButtonState(button, ERROR_TEXT, ERROR_CLASS);
        }
      }

      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }

      resetTimer = window.setTimeout(() => {
        setButtonState(button, BUTTON_TEXT);
      }, RESET_DELAY);
    });

    return button;
  }

  function enhanceCodeBlocks(article: HTMLElement): void {
    article.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
      if (pre.dataset.copyCodeReady === "true" || !pre.querySelector("code")) {
        return;
      }

      pre.dataset.copyCodeReady = "true";
      pre.classList.add(WRAPPER_CLASS);
      pre.appendChild(createButton(pre));
    });
  }

  function init(): void {
    const article = getArticleContainer();
    if (!article) return;

    enhanceCodeBlocks(article);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

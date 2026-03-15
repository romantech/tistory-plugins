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
  const STYLE_ID = "rp-copy-code-style";
  const LINE_NUMBER_ROW_SELECTOR = ".hljs-ln-code .hljs-ln-line";
  const LINE_NUMBER_CELL_SELECTOR = ".hljs-ln-code";

  const STYLE_TEXT = `
      .${WRAPPER_CLASS} {
        position: relative;
      }

      .${BUTTON_CLASS} {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        z-index: 10;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid rgba(240, 246, 252, 0.16);
        border-radius: 6px;
        background: rgba(33, 38, 45, 0.92);
        color: #c9d1d9;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        letter-spacing: 0;
        cursor: pointer;
        user-select: none;
        opacity: 0;
        transition:
          opacity 0.18s ease,
          background-color 0.18s ease,
          border-color 0.18s ease,
          color 0.18s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .${WRAPPER_CLASS}:hover .${BUTTON_CLASS},
      .${WRAPPER_CLASS}:focus-within .${BUTTON_CLASS} {
        opacity: 1;
      }

      .${BUTTON_CLASS}:hover {
        background: #30363d;
        border-color: rgba(240, 246, 252, 0.28);
        color: #f0f6fc;
      }

      .${BUTTON_CLASS}:focus-visible {
        opacity: 1;
        outline: 2px solid #2f81f7;
        outline-offset: 2px;
      }

      .${BUTTON_CLASS}.${COPIED_CLASS} {
        background: rgba(35, 134, 54, 0.18);
        border-color: rgba(63, 185, 80, 0.45);
        color: #3fb950;
        opacity: 1;
      }

      .${BUTTON_CLASS}.${ERROR_CLASS} {
        background: rgba(248, 81, 73, 0.16);
        border-color: rgba(248, 81, 73, 0.4);
        color: #ff7b72;
        opacity: 1;
      }

      @media (hover: none) {
        .${BUTTON_CLASS} {
          opacity: 1;
        }
      }
    `;

  const BUTTON_TEXT = "Copy";
  const SUCCESS_TEXT = "Copied";
  const ERROR_TEXT = "Error";
  const RESET_DELAY = 2000;

  function normalizeLineBreaks(text: string): string {
    return text.replace(/\r\n?/g, "\n");
  }

  function getJoinedText(elements: NodeListOf<HTMLElement>): string {
    return Array.from(elements)
      .map((element) => element.textContent ?? "")
      .join("\n");
  }

  function getArticleContainer(): HTMLElement | null {
    for (const selector of CONTAINER_SELECTORS) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) return element;
    }

    return null;
  }

  function injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;

    document.head.appendChild(style);
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
    if (!code) {
      return "";
    }

    const lineNumberRows = code.querySelectorAll<HTMLElement>(
      LINE_NUMBER_ROW_SELECTOR,
    );

    if (lineNumberRows.length > 0) {
      return getJoinedText(lineNumberRows);
    }

    const lineNumberCells = code.querySelectorAll<HTMLElement>(
      LINE_NUMBER_CELL_SELECTOR,
    );

    if (lineNumberCells.length > 0) {
      return getJoinedText(lineNumberCells);
    }

    return normalizeLineBreaks(code.textContent ?? "");
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
    const preElements = article.querySelectorAll<HTMLElement>("pre");

    preElements.forEach((pre) => {
      if (pre.dataset.copyCodeReady === "true") return;
      if (!pre.querySelector("code")) return;

      pre.dataset.copyCodeReady = "true";
      pre.classList.add(WRAPPER_CLASS);

      const button = createButton(pre);
      pre.appendChild(button);
    });
  }

  function init(): void {
    const article = getArticleContainer();
    if (!article) return;

    injectStyle();
    enhanceCodeBlocks(article);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

import "./style.css";
import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import { getCopyCodeConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";

const CURRENT_SCRIPT =
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;

(() => {
  ensurePluginStylesheet("copy-code", CURRENT_SCRIPT);

  const WRAPPER_CLASS = "rp-copy-code-wrapper";
  const BUTTON_CLASS = "rp-copy-code-button";
  const COPIED_CLASS = "is-copied";
  const ERROR_CLASS = "is-error";
  const LINE_TEXT_SELECTORS = [
    ".hljs-ln-code .hljs-ln-line",
    ".hljs-ln-code",
  ] as const;

  const DEFAULT_BUTTON_TEXT = "Copy";
  const DEFAULT_SUCCESS_TEXT = "Copied";
  const DEFAULT_ERROR_TEXT = "Error";
  const DEFAULT_ARIA_LABEL = "Copy code";
  const RESET_DELAY = 2000;

  function getLabels(): {
    ariaLabel: string;
    buttonText: string;
    errorText: string;
    successText: string;
  } {
    const config = getCopyCodeConfig();

    return {
      ariaLabel: config.ariaLabel || DEFAULT_ARIA_LABEL,
      buttonText: config.buttonText || DEFAULT_BUTTON_TEXT,
      errorText: config.errorText || DEFAULT_ERROR_TEXT,
      successText: config.successText || DEFAULT_SUCCESS_TEXT,
    };
  }

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
    const labels = getLabels();
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = labels.buttonText;
    button.setAttribute("aria-label", labels.ariaLabel);

    let resetTimer: number | undefined;

    button.addEventListener("click", async () => {
      const text = getCodeText(pre);

      if (!text.trim()) {
        setButtonState(button, labels.errorText, ERROR_CLASS);
      } else {
        try {
          await copyText(text);
          setButtonState(button, labels.successText, COPIED_CLASS);
        } catch {
          setButtonState(button, labels.errorText, ERROR_CLASS);
        }
      }

      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }

      resetTimer = window.setTimeout(() => {
        setButtonState(button, labels.buttonText);
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
    const article = getTistoryArticle();
    if (!article) return;

    enhanceCodeBlocks(article);
  }

  runOnDocumentReady(init);
})();

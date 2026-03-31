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
  const LABEL_CLASS = "rp-copy-code-label";
  const BUTTON_VISIBLE_CLASS = "is-button-visible";
  const LABEL_HIDDEN_CLASS = "is-label-hidden";
  const TOUCH_ACTIVE_CLASS = "is-touch-active";
  const COPIED_CLASS = "is-copied";
  const ERROR_CLASS = "is-error";
  const LINE_TEXT_SELECTORS = [
    ".hljs-ln-code .hljs-ln-line",
    ".hljs-ln-code",
  ] as const;
  const LANGUAGE_ATTRIBUTE_NAMES = [
    "data-language",
    "data-code-language",
    "data-ke-language",
    "lang",
  ] as const;
  const LANGUAGE_CLASS_PATTERNS = [/^language-(.+)$/i, /^lang-(.+)$/i] as const;
  const KNOWN_LANGUAGE_LABELS = {
    bash: "SH",
    c: "C",
    "c#": "C#",
    cpp: "C++",
    cs: "C#",
    css: "CSS",
    dockerfile: "DOCKER",
    go: "GO",
    gql: "GQL",
    graphql: "GQL",
    htm: "HTML",
    html: "HTML",
    ini: "INI",
    java: "JAVA",
    js: "JS",
    javascript: "JS",
    json: "JSON",
    jsx: "JSX",
    kt: "KT",
    kotlin: "KT",
    less: "LESS",
    lua: "LUA",
    markdown: "MD",
    md: "MD",
    mdx: "MDX",
    objectivec: "OBJ-C",
    "objective-c": "OBJ-C",
    php: "PHP",
    plaintext: "TXT",
    powershell: "PS",
    py: "PY",
    python: "PY",
    rb: "RB",
    rs: "RS",
    ruby: "RB",
    rust: "RS",
    sass: "SASS",
    scss: "SCSS",
    shell: "SH",
    sh: "SH",
    sql: "SQL",
    svg: "SVG",
    swift: "SWIFT",
    toml: "TOML",
    text: "TXT",
    ts: "TS",
    tsx: "TSX",
    txt: "TXT",
    typescript: "TS",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
    zsh: "SH",
  } as const;
  const KNOWN_LANGUAGE_NAMES = new Set(Object.keys(KNOWN_LANGUAGE_LABELS));

  const DEFAULT_BUTTON_TEXT = "Copy";
  const DEFAULT_SUCCESS_TEXT = "Copied";
  const DEFAULT_ERROR_TEXT = "Failed";
  const DEFAULT_ARIA_LABEL = "Copy code";
  const DEFAULT_LANGUAGE_LABEL = "Code";
  const RESET_DELAY = 2000;

  let isTouchListenerBound = false;

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

  function sanitizeLanguageToken(token: string): string {
    return token
      .trim()
      .replace(/^['"]+|['"]+$/g, "")
      .replace(/[;:,.]+$/g, "")
      .toLowerCase();
  }

  function isValidLanguageToken(token: string): boolean {
    return /^[a-z0-9][a-z0-9#+._-]*$/i.test(token);
  }

  function getLanguageTokenFromValue(
    value: string,
    options: {
      allowUnknownToken: boolean;
    },
  ): string | null {
    const brushMatch = value.match(/brush:\s*([a-z0-9#+._-]+)/i);
    if (brushMatch) {
      return sanitizeLanguageToken(brushMatch[1]);
    }

    for (const rawToken of value.split(/\s+/)) {
      const token = sanitizeLanguageToken(rawToken);
      if (!token) continue;

      for (const pattern of LANGUAGE_CLASS_PATTERNS) {
        const match = token.match(pattern);
        if (match) {
          return sanitizeLanguageToken(match[1]);
        }
      }

      if (KNOWN_LANGUAGE_NAMES.has(token)) {
        return token;
      }
    }

    const normalizedValue = sanitizeLanguageToken(value);

    if (
      options.allowUnknownToken &&
      normalizedValue &&
      isValidLanguageToken(normalizedValue)
    ) {
      return normalizedValue;
    }

    return null;
  }

  function formatLanguageLabel(language: string | null): string {
    if (!language) return DEFAULT_LANGUAGE_LABEL;

    const normalizedLanguage = sanitizeLanguageToken(language);
    if (!normalizedLanguage) return DEFAULT_LANGUAGE_LABEL;

    const knownLabel =
      KNOWN_LANGUAGE_LABELS[
        normalizedLanguage as keyof typeof KNOWN_LANGUAGE_LABELS
      ];
    if (knownLabel) return knownLabel;

    return normalizedLanguage
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.slice(0, 4).toUpperCase())
      .join("-");
  }

  function getLanguageLabel(pre: HTMLElement): string {
    const code = pre.querySelector<HTMLElement>("code");
    const elements = [pre, code].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );

    for (const element of elements) {
      for (const attributeName of LANGUAGE_ATTRIBUTE_NAMES) {
        const value = element.getAttribute(attributeName);
        if (!value) continue;

        const language = getLanguageTokenFromValue(value, {
          allowUnknownToken: true,
        });
        if (language) {
          return formatLanguageLabel(language);
        }
      }
    }

    for (const element of elements) {
      const language = getLanguageTokenFromValue(element.className, {
        allowUnknownToken: false,
      });
      if (language) {
        return formatLanguageLabel(language);
      }
    }

    return DEFAULT_LANGUAGE_LABEL;
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

  function clearActiveTouchWrappers(): void {
    document
      .querySelectorAll<HTMLElement>(`.${WRAPPER_CLASS}.${TOUCH_ACTIVE_CLASS}`)
      .forEach((wrapper) => {
        wrapper.classList.remove(TOUCH_ACTIVE_CLASS);
        applyOverlayVisibility(wrapper);
      });
  }

  function setActiveTouchWrapper(wrapper: HTMLElement): void {
    if (wrapper.classList.contains(TOUCH_ACTIVE_CLASS)) return;

    clearActiveTouchWrappers();
    wrapper.classList.add(TOUCH_ACTIVE_CLASS);
    applyOverlayVisibility(wrapper);
  }

  function showButton(wrapper: HTMLElement): void {
    wrapper.classList.add(BUTTON_VISIBLE_CLASS);
    applyOverlayVisibility(wrapper);
  }

  function hideButton(wrapper: HTMLElement): void {
    wrapper.classList.remove(BUTTON_VISIBLE_CLASS);
    applyOverlayVisibility(wrapper);
  }

  function isButtonStateVisible(wrapper: HTMLElement): boolean {
    const button = wrapper.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if (!button) return false;

    return (
      wrapper.classList.contains(BUTTON_VISIBLE_CLASS) ||
      wrapper.classList.contains(TOUCH_ACTIVE_CLASS) ||
      button.classList.contains(COPIED_CLASS) ||
      button.classList.contains(ERROR_CLASS)
    );
  }

  function applyOverlayVisibility(wrapper: HTMLElement): void {
    const button = wrapper.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    const label = wrapper.querySelector<HTMLElement>(`.${LABEL_CLASS}`);
    if (!button || !label) return;

    const isButtonVisible = isButtonStateVisible(wrapper);
    const isLabelHidden = isButtonVisible;

    button.style.setProperty(
      "opacity",
      isButtonVisible ? "1" : "0",
      "important",
    );
    button.style.setProperty(
      "pointer-events",
      isButtonVisible ? "auto" : "none",
      "important",
    );

    label.style.setProperty("opacity", isLabelHidden ? "0" : "1", "important");
    wrapper.classList.toggle(LABEL_HIDDEN_CLASS, isLabelHidden);
  }

  function bindTouchListener(): void {
    if (isTouchListenerBound) return;

    isTouchListenerBound = true;

    window.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType !== "touch") return;
        if (!(event.target instanceof Element)) return;

        const wrapper = event.target.closest(`.${WRAPPER_CLASS}`);
        if (wrapper instanceof HTMLElement) {
          setActiveTouchWrapper(wrapper);
          return;
        }

        clearActiveTouchWrappers();
      },
      {
        capture: true,
      },
    );
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

      applyOverlayVisibility(pre);

      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }

      resetTimer = window.setTimeout(() => {
        setButtonState(button, labels.buttonText);

        if (pre.classList.contains(TOUCH_ACTIVE_CLASS)) {
          clearActiveTouchWrappers();
        }

        applyOverlayVisibility(pre);
      }, RESET_DELAY);
    });

    return button;
  }

  function createLanguageLabel(pre: HTMLElement): HTMLSpanElement {
    const label = document.createElement("span");
    label.className = LABEL_CLASS;
    label.textContent = getLanguageLabel(pre);
    label.setAttribute("aria-hidden", "true");
    return label;
  }

  function bindInteractionState(wrapper: HTMLElement): void {
    wrapper.addEventListener("mouseenter", () => {
      showButton(wrapper);
    });

    wrapper.addEventListener("mouseleave", () => {
      if (wrapper.classList.contains(TOUCH_ACTIVE_CLASS)) return;
      hideButton(wrapper);
    });

    wrapper.addEventListener("focusin", () => {
      showButton(wrapper);
    });

    wrapper.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (wrapper.contains(document.activeElement)) return;
        if (wrapper.classList.contains(TOUCH_ACTIVE_CLASS)) return;

        hideButton(wrapper);
      }, 0);
    });
  }

  function enhanceCodeBlocks(article: HTMLElement): void {
    article.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
      if (pre.dataset.copyCodeReady === "true" || !pre.querySelector("code")) {
        return;
      }

      pre.dataset.copyCodeReady = "true";
      pre.classList.add(WRAPPER_CLASS);
      const button = createButton(pre);
      const label = createLanguageLabel(pre);

      bindInteractionState(pre);
      pre.append(button, label);
      applyOverlayVisibility(pre);
    });
  }

  function init(): void {
    const article = getTistoryArticle();
    if (!article) return;

    clearActiveTouchWrappers();
    bindTouchListener();
    enhanceCodeBlocks(article);
  }

  runOnDocumentReady(init);
})();

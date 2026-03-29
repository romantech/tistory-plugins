import type renderMathInElement from "katex/contrib/auto-render";
import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import { getKatexConfig } from "@/shared/plugin-config";

type KatexState = typeof globalThis & {
  __tistoryPluginsKatexLoadPromise?: Promise<void>;
  katex?: unknown;
  renderMathInElement?: typeof renderMathInElement;
};

type KatexRenderOptions = NonNullable<
  Parameters<typeof renderMathInElement>[1]
>;
type KatexDelimiter = NonNullable<KatexRenderOptions["delimiters"]>[number];
type KatexIgnoredTag = keyof HTMLElementTagNameMap;

(() => {
  const KATEX_VERSION = "0.16.38";
  const CDN_BASE = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;
  const STYLESHEET_ID = "tistory-plugins-katex-css";
  const KATEX_SCRIPT_ID = "tistory-plugins-katex-js";
  const AUTO_RENDER_SCRIPT_ID = "tistory-plugins-katex-auto-render-js";
  const LOAD_PROMISE_KEY = "__tistoryPluginsKatexLoadPromise";
  const PROTECTED_CURRENCY_CLASS = "tistory-plugins-katex-currency";
  const DEFAULT_DELIMITERS: readonly KatexDelimiter[] = [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
  ] as const;
  const DEFAULT_IGNORED_TAGS: readonly KatexIgnoredTag[] = [
    "script",
    "noscript",
    "style",
    "textarea",
    "pre",
    "code",
  ] as const;

  const asBool = (v: unknown): boolean => (typeof v === "boolean" ? v : false);

  const isDigit = (char: string | undefined): boolean =>
    typeof char === "string" && /^\d$/u.test(char);

  const isWhitespace = (char: string | undefined): boolean =>
    typeof char === "string" && /^\s$/u.test(char);

  const isPriceBoundary = (char: string | undefined): boolean =>
    typeof char === "undefined" ||
    isWhitespace(char) ||
    /^[,.;:!?)\]%}]$/u.test(char);

  const MATH_COMMAND_PATTERN = /\\[A-Za-z]+/u;
  const MATH_OPERATOR_PATTERN = /[=+\-*/^_<>|()[\]{}]/u;
  const NUMERIC_SEQUENCE_PATTERN = /^\d+(?:[.,]\d+)?(?:,\s+\d+(?:[.,]\d+)?)+$/u;

  function isKatexRendered(article: HTMLElement): boolean {
    return article.dataset.katexRendered === "true";
  }

  function markKatexRendered(article: HTMLElement): void {
    article.dataset.katexRendered = "true";
  }

  function getIgnoredTags(
    config: ReturnType<typeof getKatexConfig>,
  ): KatexIgnoredTag[] {
    const { ignoredTags } = config;
    if (!Array.isArray(ignoredTags) || ignoredTags.length === 0) {
      return [...DEFAULT_IGNORED_TAGS];
    }

    return ignoredTags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag): tag is KatexIgnoredTag => tag.length > 0);
  }

  function getRenderOptions(): KatexRenderOptions {
    const config = getKatexConfig();

    return {
      delimiters:
        Array.isArray(config.delimiters) && config.delimiters.length > 0
          ? config.delimiters
          : DEFAULT_DELIMITERS,
      ignoredClasses: [PROTECTED_CURRENCY_CLASS],
      ignoredTags: getIgnoredTags(config),
      strict: asBool(config.strict),
      throwOnError: asBool(config.throwOnError),
    };
  }

  function hasSingleDollarDelimiter(
    delimiters: KatexRenderOptions["delimiters"],
  ): boolean {
    return (
      delimiters?.some(({ left, right }) => left === "$" && right === "$") ??
      false
    );
  }

  function getPriceLikeInlineDollarEnd(
    text: string,
    index: number,
  ): number | null {
    if (text[index] !== "$") return null;
    if (text[index - 1] === "$" || text[index + 1] === "$") return null;

    let cursor = index + 1;
    while (cursor < text.length && isWhitespace(text[cursor])) {
      cursor += 1;
    }

    if (!isDigit(text[cursor])) return null;

    cursor += 1;
    while (cursor < text.length) {
      const char = text[cursor];
      if (isDigit(char)) {
        cursor += 1;
        continue;
      }

      if ((char === "," || char === ".") && isDigit(text[cursor + 1])) {
        cursor += 1;
        continue;
      }

      break;
    }

    if (text[cursor] === "$") return null;
    if (!isPriceBoundary(text[cursor])) return null;

    return cursor;
  }

  function createProtectedCurrencyNode(text: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.className = PROTECTED_CURRENCY_CLASS;
    span.textContent = text;

    return span;
  }

  function isLikelyInlineMathToken(token: string): boolean {
    const normalizedToken = token.replace(/^[,.;:!?]+|[,.;:!?]+$/gu, "");
    if (normalizedToken.length === 0) {
      return /^[,.;:!?]+$/u.test(token);
    }

    return (
      /^[A-Za-z]$/u.test(normalizedToken) ||
      /^\d+(?:[.,]\d+)*$/u.test(normalizedToken) ||
      /^\\[A-Za-z]+$/u.test(normalizedToken) ||
      /^[=+\-*/^_<>|()[\]{}]+$/u.test(normalizedToken)
    );
  }

  function isLikelyInlineMathContent(content: string): boolean {
    if (content.length === 0) return false;
    if (!/\s/u.test(content)) return true;

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) return false;
    if (MATH_COMMAND_PATTERN.test(trimmedContent)) return true;
    if (MATH_OPERATOR_PATTERN.test(trimmedContent)) return true;
    if (NUMERIC_SEQUENCE_PATTERN.test(trimmedContent)) return true;

    const tokens = trimmedContent.split(/\s+/u);
    const hasStrongMathSignal = tokens.some((token) =>
      /[A-Za-z\\=+\-*/^_<>|()[\]{}]/u.test(token),
    );
    if (!hasStrongMathSignal) return false;

    return tokens.every((token) => isLikelyInlineMathToken(token));
  }

  function getLikelyInlineMathClosingDollar(
    text: string,
    openIndex: number,
  ): number | null {
    for (let index = openIndex + 1; index < text.length; index += 1) {
      if (text[index] !== "$") continue;
      if (text[index - 1] === "$" || text[index + 1] === "$") continue;

      const inlineMathContent = text.slice(openIndex + 1, index);
      if (isLikelyInlineMathContent(inlineMathContent)) {
        return index;
      }
    }

    return null;
  }

  function splitPriceLikeInlineDollars(text: string): Node[] | null {
    const nodes: Node[] = [];
    let segmentStart = 0;
    let hasSplit = false;

    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== "$") continue;
      if (text[index - 1] === "$" || text[index + 1] === "$") continue;

      const inlineMathClosingDollar = getLikelyInlineMathClosingDollar(
        text,
        index,
      );
      if (inlineMathClosingDollar !== null) {
        index = inlineMathClosingDollar;
        continue;
      }

      const protectedEnd = getPriceLikeInlineDollarEnd(text, index);
      if (protectedEnd === null) {
        continue;
      }

      hasSplit = true;

      if (segmentStart < index) {
        nodes.push(document.createTextNode(text.slice(segmentStart, index)));
      }

      nodes.push(createProtectedCurrencyNode(text.slice(index, protectedEnd)));
      segmentStart = protectedEnd;
      index = protectedEnd - 1;
    }

    if (!hasSplit) return null;

    if (segmentStart < text.length) {
      nodes.push(document.createTextNode(text.slice(segmentStart)));
    }

    return nodes;
  }

  function isInsideIgnoredTag(
    textNode: Text,
    ignoredTags: readonly string[],
  ): boolean {
    if (ignoredTags.length === 0) return false;

    let parent = textNode.parentElement;
    while (parent) {
      if (ignoredTags.includes(parent.tagName.toLowerCase())) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  }

  function protectInlineCurrency(
    article: HTMLElement,
    ignoredTags: readonly string[],
  ): void {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent?.includes("$")) return NodeFilter.FILTER_REJECT;
        if (isInsideIgnoredTag(node, ignoredTags)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode instanceof Text) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const splitNodes = splitPriceLikeInlineDollars(textNode.data);
      if (!splitNodes) continue;
      textNode.replaceWith(...splitNodes);
    }
  }

  function ensureStylesheet(): void {
    if (document.getElementById(STYLESHEET_ID)) return;

    const link = document.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = `${CDN_BASE}/katex.min.css`;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function waitForScript(script: HTMLElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (script.dataset.loaded === "true") {
        resolve();
        return;
      }

      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
    });
  }

  async function loadScript(id: string, src: string): Promise<void> {
    const existing = document.getElementById(id);
    if (existing) return waitForScript(existing, src);

    const script = document.createElement("script");
    script.id = id;
    script.defer = true;
    script.src = src;
    script.crossOrigin = "anonymous";

    const promise = waitForScript(script, src);
    document.head.appendChild(script);

    await promise;
  }

  function ensureKatexAssets(): Promise<void> {
    const state = globalThis as KatexState;
    if (state[LOAD_PROMISE_KEY]) return state[LOAD_PROMISE_KEY];

    ensureStylesheet();

    state[LOAD_PROMISE_KEY] = (async () => {
      if (typeof state.katex === "undefined") {
        await loadScript(KATEX_SCRIPT_ID, `${CDN_BASE}/katex.min.js`);
      }

      if (typeof state.renderMathInElement !== "function") {
        await loadScript(
          AUTO_RENDER_SCRIPT_ID,
          `${CDN_BASE}/contrib/auto-render.min.js`,
        );
      }
    })().catch((error) => {
      delete state[LOAD_PROMISE_KEY];
      throw error;
    });

    return state[LOAD_PROMISE_KEY];
  }

  async function initKatexPlugin(): Promise<void> {
    const initialArticle = getTistoryArticle();
    if (!initialArticle || isKatexRendered(initialArticle)) return;

    try {
      await ensureKatexAssets();
    } catch (error) {
      console.error("[tistory-plugins/katex] asset load failed", error);
      return;
    }

    const article = getTistoryArticle();
    if (!article || isKatexRendered(article)) return;

    const state = globalThis satisfies KatexState;
    if (typeof state.renderMathInElement !== "function") return;

    const renderOptions = getRenderOptions();

    if (hasSingleDollarDelimiter(renderOptions.delimiters)) {
      protectInlineCurrency(article, renderOptions.ignoredTags ?? []);
    }

    state.renderMathInElement(article, renderOptions);

    markKatexRendered(article);
  }

  runOnDocumentReady(initKatexPlugin);
})();

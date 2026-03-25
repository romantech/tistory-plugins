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

  const KATEX_TEXT_SCAN_EXCLUDED_SELECTORS = [
    "pre",
    "code",
    "script",
    "style",
    "textarea",
    "noscript",
    "[hidden]",
    '[aria-hidden="true"]',
    ".activity-content-wrap",
    ".another-category",
    ".revenue_unit_wrap",
    "[data-tistory-react-app]",
  ].join(", ");

  const KATEX_TEXT_HINT_REGEX =
    /\$\$[^$]+\$\$|\$(?!\s)(?:\\.|[^$\n\\])+\$|\\\((?:\\.|[^\\\n])+\\\)|\\\[(?:\\.|[^\\\n])+\\\]/;

  const asBool = (v: unknown): boolean => (typeof v === "boolean" ? v : false);

  function isKatexRendered(article: HTMLElement): boolean {
    return article.dataset.katexRendered === "true";
  }

  function markKatexRendered(article: HTMLElement): void {
    article.dataset.katexRendered = "true";
  }

  function hasKatexContent(article: HTMLElement): boolean {
    const clone = article.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return false;

    clone
      .querySelectorAll(KATEX_TEXT_SCAN_EXCLUDED_SELECTORS)
      .forEach((node) => {
        node.remove();
      });

    return KATEX_TEXT_HINT_REGEX.test(clone.textContent ?? "");
  }

  function shouldRenderKatex(article: HTMLElement): boolean {
    return !isKatexRendered(article) && hasKatexContent(article);
  }

  function getIgnoredTags(
    config: ReturnType<typeof getKatexConfig>,
  ): KatexIgnoredTag[] {
    const { ignoredTags } = config;
    if (!Array.isArray(ignoredTags) || ignoredTags.length === 0) {
      return [...DEFAULT_IGNORED_TAGS];
    }

    return ignoredTags.filter((tag): tag is KatexIgnoredTag => {
      return typeof tag === "string" && tag.length > 0;
    });
  }

  function getRenderOptions(): KatexRenderOptions {
    const config = getKatexConfig();

    return {
      delimiters:
        Array.isArray(config.delimiters) && config.delimiters.length > 0
          ? config.delimiters
          : DEFAULT_DELIMITERS,
      ignoredTags: getIgnoredTags(config),
      strict: asBool(config.strict),
      throwOnError: asBool(config.throwOnError),
    };
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
    if (!initialArticle || !shouldRenderKatex(initialArticle)) return;

    try {
      await ensureKatexAssets();
    } catch (error) {
      console.error("[tistory-plugins/katex] asset load failed", error);
      return;
    }

    const article = getTistoryArticle();
    if (!article || !shouldRenderKatex(article)) return;

    const state = globalThis satisfies KatexState;
    if (typeof state.renderMathInElement !== "function") return;

    state.renderMathInElement(article, getRenderOptions());

    markKatexRendered(article);
  }

  runOnDocumentReady(initKatexPlugin);
})();

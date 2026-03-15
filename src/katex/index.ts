type RenderMathInElement = (
  element: HTMLElement,
  options: {
    delimiters: Array<{ left: string; right: string; display: boolean }>;
    ignoredTags: string[];
    throwOnError: boolean;
    strict: boolean;
  },
) => void;

type KatexState = typeof globalThis & {
  __tistoryPluginsKatexLoadPromise?: Promise<void>;
  katex?: unknown;
  renderMathInElement?: RenderMathInElement;
};

(() => {
  const ARTICLE_SELECTORS = [
    "#article",
    ".article-view",
    ".tt_article_useless_p_margin",
  ];
  const KATEX_VERSION = "0.16.38";
  const STYLESHEET_ID = "tistory-plugins-katex-css";
  const KATEX_SCRIPT_ID = "tistory-plugins-katex-js";
  const AUTO_RENDER_SCRIPT_ID = "tistory-plugins-katex-auto-render-js";
  const LOAD_PROMISE_KEY = "__tistoryPluginsKatexLoadPromise";

  function findArticle(): HTMLElement | undefined {
    return ARTICLE_SELECTORS.map((selector) =>
      document.querySelector<HTMLElement>(selector),
    ).find((article): article is HTMLElement => article !== null);
  }

  function ensureStylesheet(): void {
    if (document.getElementById(STYLESHEET_ID)) return;

    const link = document.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function loadScript(id: string, src: string): Promise<void> {
    const existing = document.getElementById(id);
    if (existing) {
      return new Promise((resolve, reject) => {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error(`Failed to load ${src}`)),
          { once: true },
        );
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.defer = true;
      script.src = src;
      script.crossOrigin = "anonymous";
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
      document.head.appendChild(script);
    });
  }

  function ensureKatexAssets(): Promise<void> {
    const state = globalThis as KatexState;
    if (state[LOAD_PROMISE_KEY]) return state[LOAD_PROMISE_KEY];

    ensureStylesheet();

    state[LOAD_PROMISE_KEY] = (async () => {
      if (typeof state.katex === "undefined") {
        await loadScript(
          KATEX_SCRIPT_ID,
          `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`,
        );
      }

      if (typeof state.renderMathInElement !== "function") {
        await loadScript(
          AUTO_RENDER_SCRIPT_ID,
          `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js`,
        );
      }
    })().catch((error) => {
      delete state[LOAD_PROMISE_KEY];
      throw error;
    });

    return state[LOAD_PROMISE_KEY];
  }

  async function initKatexPlugin(): Promise<void> {
    const article = findArticle();
    if (!article || article.dataset.katexRendered === "true") return;

    try {
      await ensureKatexAssets();
    } catch (error) {
      console.error("[tistory-plugins/katex] asset load failed", error);
      return;
    }

    const state = globalThis as KatexState;
    if (typeof state.renderMathInElement !== "function") return;

    state.renderMathInElement(article, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      throwOnError: false,
      strict: false,
    });

    article.dataset.katexRendered = "true";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKatexPlugin, {
      once: true,
    });
  } else {
    initKatexPlugin();
  }
})();

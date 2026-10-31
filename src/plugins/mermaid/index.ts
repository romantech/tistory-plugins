import "./style.css";
import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import { MERMAID_SELECTOR } from "@/shared/mermaid";
import { getMermaidConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";

type MountedDiagram = {
  destroy(): void;
  error?: unknown;
};

type Pele = {
  mount(
    element: HTMLElement,
    source: string,
    options: { zoom: false },
  ): MountedDiagram;
};

type MermaidState = typeof globalThis & {
  __tistoryPluginsPeleLoadPromise?: Promise<Pele>;
  pele?: Pele;
};

(() => {
  const PELE_URL =
    "https://cdn.jsdelivr.net/npm/pele@1.6.0/dist/pele.global.js";
  const LOAD_TIMEOUT = 15_000;

  function loadPele(): Promise<Pele> {
    const state = globalThis as MermaidState;
    if (typeof state.pele?.mount === "function") {
      return Promise.resolve(state.pele);
    }
    if (state.__tistoryPluginsPeleLoadPromise) {
      return state.__tistoryPluginsPeleLoadPromise;
    }

    state.__tistoryPluginsPeleLoadPromise = new Promise<Pele>(
      (resolve, reject) => {
        const script = document.createElement("script");
        script.src = PELE_URL;
        script.async = true;
        script.crossOrigin = "anonymous";

        const finish = (error?: Error): void => {
          window.clearTimeout(timer);
          script.onload = null;
          script.onerror = null;
          if (error) {
            script.remove();
            reject(error);
          } else if (typeof state.pele?.mount === "function") {
            resolve(state.pele);
          } else {
            script.remove();
            reject(new Error("Pele mount API is unavailable"));
          }
        };

        const timer = window.setTimeout(
          () => finish(new Error("Pele load timed out")),
          LOAD_TIMEOUT,
        );
        script.onload = () => finish();
        script.onerror = () => finish(new Error("Pele load failed"));
        document.head.append(script);
      },
    ).catch((error) => {
      delete state.__tistoryPluginsPeleLoadPromise;
      throw error;
    });

    return state.__tistoryPluginsPeleLoadPromise;
  }

  async function init(): Promise<void> {
    const article = getTistoryArticle();
    if (!article) return;

    const elements = new Set(
      Array.from(article.querySelectorAll<HTMLElement>(MERMAID_SELECTOR)).map(
        (element) =>
          element.matches("code") && element.parentElement?.matches("pre")
            ? element.parentElement
            : element,
      ),
    );
    const targets = [...elements]
      .filter(
        (element) =>
          !element.dataset.mermaidState &&
          !element.parentElement?.closest(MERMAID_SELECTOR),
      )
      .map((element) => ({
        element,
        source:
          (element.querySelector(":scope > code") ?? element).textContent ?? "",
      }))
      .filter(({ source }) => source.trim().length > 0);
    if (targets.length === 0) return;

    for (const { element } of targets) {
      element.dataset.mermaidState = "loading";
    }
    ensurePluginStylesheet("mermaid");

    try {
      const pele = await loadPele();
      const { theme } = getMermaidConfig();

      for (const { element, source } of targets) {
        if (!article.contains(element) || !element.isConnected) continue;

        const container = document.createElement("div");
        container.className = "rp-mermaid";
        container.dataset.mermaidState = "ready";
        if (theme === "light" || theme === "dark") {
          container.dataset.mermaidTheme = theme;
        }
        element.before(container);

        let diagram: MountedDiagram | undefined;
        try {
          diagram = pele.mount(container, source, { zoom: false });
          if (diagram.error !== undefined) throw diagram.error;

          container.id = element.id;
          element.remove();
        } catch (error) {
          diagram?.destroy();
          container.remove();
          console.error("[tistory-plugins/mermaid] render failed", error);
        }
      }
    } catch (error) {
      console.error("[tistory-plugins/mermaid] asset load failed", error);
    } finally {
      for (const { element } of targets) {
        delete element.dataset.mermaidState;
      }
    }
  }

  runOnDocumentReady(init);
})();

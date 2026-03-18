import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import { getInlineCodeConfig } from "@/shared/plugin-config";

(() => {
  const DEFAULT_TARGET_SELECTOR =
    "p, blockquote, .table-content, h1, h2, h3, h4, li, figcaption";
  const DEFAULT_BLOCKED_SELECTOR = "code, pre, script, style, textarea";
  const INLINE_CODE_PATTERN = /`([^`\n]+)`/;

  function getTargetSelector(): string {
    return getInlineCodeConfig().targetSelector || DEFAULT_TARGET_SELECTOR;
  }

  function getBlockedSelector(): string {
    return getInlineCodeConfig().blockedSelector || DEFAULT_BLOCKED_SELECTOR;
  }

  function collectTextNodes(container: ParentNode): Text[] {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_SKIP;

        const inTarget = parent.closest(getTargetSelector());
        const inBlocked = parent.closest(getBlockedSelector());

        return inTarget && !inBlocked
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      if (walker.currentNode instanceof Text) {
        textNodes.push(walker.currentNode);
      }
    }

    return textNodes;
  }

  function wrapInlineCode(textNode: Text): void {
    const parts = textNode.textContent?.split(/`([^`\n]+)`/) ?? [];
    if (parts.length === 1) return;

    const fragment = document.createDocumentFragment();

    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }

      const code = document.createElement("code");
      code.textContent = part;
      fragment.appendChild(code);
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  function initInlineCodePlugin(): void {
    const article = getTistoryArticle();
    if (!article) return;

    collectTextNodes(article).forEach((textNode) => {
      if (!INLINE_CODE_PATTERN.test(textNode.textContent ?? "")) return;
      wrapInlineCode(textNode);
    });
  }

  runOnDocumentReady(initInlineCodePlugin);
})();

(() => {
  const CONTAINER_SELECTOR = "#article";
  const TARGET_SELECTOR =
    "p, blockquote, .table-content, h1, h2, h3, h4, li, figcaption";
  const BLOCKED_SELECTOR = "code, pre, script, style, textarea";
  const INLINE_CODE_PATTERN = /`([^`\n]+)`/;

  function collectTextNodes(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_SKIP;

        const inTarget = parent.closest(TARGET_SELECTOR);
        const inBlocked = parent.closest(BLOCKED_SELECTOR);

        return inTarget && !inBlocked
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    return textNodes;
  }

  function wrapInlineCode(textNode) {
    const parts = textNode.textContent.split(/`([^`\n]+)`/);
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

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function initInlineCodePlugin() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) return;

    collectTextNodes(container).forEach((textNode) => {
      if (!INLINE_CODE_PATTERN.test(textNode.textContent)) return;
      wrapInlineCode(textNode);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInlineCodePlugin, {
      once: true,
    });
  } else {
    initInlineCodePlugin();
  }
})();

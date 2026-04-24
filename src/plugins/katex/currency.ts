export const PROTECTED_CURRENCY_CLASS = "tistory-plugins-katex-currency";

const MATH_COMMAND_PATTERN = /\\[A-Za-z]+/u;
const NUMERIC_SEQUENCE_PATTERN = /^\d+(?:[.,]\d+)?(?:,\s+\d+(?:[.,]\d+)?)+$/u;
const PRICE_LIKE_PREFIX_PATTERN = /^\d+(?:[.,]\d+)*(?:\s*[,/~\-–〜]\s*)$/u;
const INLINE_MATH_SIGNAL_PATTERN = /[A-Za-z\\=+\-*/^_<>|()[\]{}]/u;

function isDigit(char: string | undefined): boolean {
  return typeof char === "string" && /^\d$/u.test(char);
}

function isWhitespace(char: string | undefined): boolean {
  return typeof char === "string" && /^\s$/u.test(char);
}

function isPriceBoundary(char: string | undefined): boolean {
  return (
    typeof char === "undefined" ||
    isWhitespace(char) ||
    /^[,.;:!?)\]%}~\-–〜]$/u.test(char)
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

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) return false;
  if (!/\s/u.test(content)) {
    return (
      INLINE_MATH_SIGNAL_PATTERN.test(trimmedContent) ||
      /^\d+(?:[.,]\d+)*$/u.test(trimmedContent)
    );
  }

  if (MATH_COMMAND_PATTERN.test(trimmedContent)) return true;
  if (NUMERIC_SEQUENCE_PATTERN.test(trimmedContent)) return true;

  const tokens = trimmedContent.split(/\s+/u);
  const hasStrongMathSignal = tokens.some((token) =>
    /[A-Za-z\\=+\-*/^_<>|()[\]{}]/u.test(token),
  );
  if (!hasStrongMathSignal) return false;

  return tokens.every((token) => isLikelyInlineMathToken(token));
}

function isLikelyPriceLikePrefix(
  content: string,
  trailingText: string,
): boolean {
  return (
    PRICE_LIKE_PREFIX_PATTERN.test(content.trim()) &&
    /^\s*\d/u.test(trailingText)
  );
}

function getLikelyInlineMathClosingDollar(
  text: string,
  openIndex: number,
): number | null {
  for (let index = openIndex + 1; index < text.length; index += 1) {
    if (text[index] !== "$") continue;
    if (text[index - 1] === "$" || text[index + 1] === "$") continue;

    const inlineMathContent = text.slice(openIndex + 1, index);
    if (isLikelyPriceLikePrefix(inlineMathContent, text.slice(index + 1))) {
      return null;
    }

    return isLikelyInlineMathContent(inlineMathContent) ? index : null;
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

function isInsideIgnoredNode(
  textNode: Text,
  ignoredTags: readonly string[],
  ignoredClasses: readonly string[],
): boolean {
  if (ignoredTags.length === 0 && ignoredClasses.length === 0) return false;

  let parent = textNode.parentElement;
  while (parent) {
    const currentParent = parent;

    if (ignoredTags.includes(currentParent.tagName.toLowerCase())) {
      return true;
    }
    if (
      ignoredClasses.some((className) =>
        currentParent.classList.contains(className),
      )
    ) {
      return true;
    }

    parent = currentParent.parentElement;
  }

  return false;
}

export function protectInlineCurrency(
  article: HTMLElement,
  ignoredTags: readonly string[],
  ignoredClasses: readonly string[],
): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.includes("$")) return NodeFilter.FILTER_REJECT;
      if (isInsideIgnoredNode(node, ignoredTags, ignoredClasses)) {
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

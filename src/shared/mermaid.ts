export const MERMAID_CLASSES = ["mermaid", "rp-mermaid"] as const;

export const MERMAID_SELECTOR = [
  ...MERMAID_CLASSES.map((className) => `.${className}`),
  'pre[data-ke-language="mermaid"]',
  "pre > code.language-mermaid",
  "pre > code.lang-mermaid",
].join(", ");

type CopyCodeConfig = {
  ariaLabel?: string;
  buttonText?: string;
  errorText?: string;
  successText?: string;
};

type HeadingAnchorConfig = {
  headerOffset?: number;
  levels?: number[];
};

type InlineCodeConfig = {
  blockedSelector?: string;
  targetSelector?: string;
};

type KatexDelimiter = {
  display: boolean;
  left: string;
  right: string;
};

type KatexConfig = {
  delimiters?: KatexDelimiter[];
  ignoredTags?: string[];
  strict?: boolean;
  throwOnError?: boolean;
};

type RPPluginsConfig = {
  articleSelectors?: string[];
  copyCode?: CopyCodeConfig;
  headingAnchor?: HeadingAnchorConfig;
  inlineCode?: InlineCodeConfig;
  katex?: KatexConfig;
};

type RPPluginsGlobal = typeof globalThis & {
  RPPlugins?: RPPluginsConfig;
};

function getGlobalConfig(): RPPluginsConfig {
  return (globalThis as RPPluginsGlobal).RPPlugins ?? {};
}

export function getArticleSelectorOverrides(): string[] {
  const selectors = getGlobalConfig().articleSelectors;
  if (!Array.isArray(selectors)) return [];

  return selectors
    .filter((selector): selector is string => typeof selector === "string")
    .map((selector) => selector.trim())
    .filter(Boolean);
}

export function getCopyCodeConfig(): CopyCodeConfig {
  return getGlobalConfig().copyCode ?? {};
}

export function getHeadingAnchorConfig(): HeadingAnchorConfig {
  return getGlobalConfig().headingAnchor ?? {};
}

export function getInlineCodeConfig(): InlineCodeConfig {
  return getGlobalConfig().inlineCode ?? {};
}

export function getKatexConfig(): KatexConfig {
  return getGlobalConfig().katex ?? {};
}

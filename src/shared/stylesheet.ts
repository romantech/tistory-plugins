function isScriptWithSrc(
  element: Element | null | undefined,
): element is HTMLScriptElement {
  return element instanceof HTMLScriptElement && element.src.length > 0;
}

function getStylesheetId(pluginName: string): string {
  return `tistory-plugins-${pluginName}-css`;
}

function findPluginScript(
  pluginName: string,
  currentScript: HTMLScriptElement | null,
): HTMLScriptElement | null {
  const candidates = new Map<string, HTMLScriptElement>();

  if (isScriptWithSrc(currentScript)) {
    candidates.set(currentScript.src, currentScript);
  }

  const suffix = `/${pluginName}/index.min.js`;
  const scripts = Array.from(
    document.querySelectorAll("script[src]"),
  ).reverse();

  for (const script of scripts) {
    if (!isScriptWithSrc(script)) continue;

    if (
      script.src.endsWith(suffix) ||
      script.src.includes(`/dist/${pluginName}/index.min.js`) ||
      script.src.includes(`${pluginName}/index.min.js`)
    ) {
      candidates.set(script.src, script);
    }
  }

  return candidates.values().next().value ?? null;
}

function findExistingStylesheet(href: string): HTMLLinkElement | null {
  for (const element of document.head.querySelectorAll(
    'link[rel="stylesheet"]',
  )) {
    if (element instanceof HTMLLinkElement && element.href === href) {
      return element;
    }
  }

  return null;
}

export function ensurePluginStylesheet(
  pluginName: string,
  currentScript: HTMLScriptElement | null = isScriptWithSrc(
    document.currentScript,
  )
    ? document.currentScript
    : null,
): HTMLLinkElement | null {
  const stylesheetId = getStylesheetId(pluginName);
  const existingById = document.getElementById(stylesheetId);

  if (existingById instanceof HTMLLinkElement) {
    return existingById;
  }

  const script = findPluginScript(pluginName, currentScript);
  if (!script) return null;

  let href: string;

  try {
    href = new URL("./index.min.css", script.src).href;
  } catch {
    return null;
  }

  const existingByHref = findExistingStylesheet(href);
  if (existingByHref) {
    existingByHref.id ||= stylesheetId;
    existingByHref.dataset.tistoryPluginStylesheet = pluginName;
    return existingByHref;
  }

  const link = document.createElement("link");
  link.id = stylesheetId;
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.tistoryPluginStylesheet = pluginName;
  document.head.append(link);
  return link;
}

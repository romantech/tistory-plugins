type RequiredElementCtor<T extends Element> = abstract new (
  ...args: never[]
) => T;

export function appendPluginScript(
  pluginName: string,
  options: {
    baseUrl?: string;
  } = {},
): HTMLScriptElement {
  const {
    baseUrl = "https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/",
  } = options;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const script = document.createElement("script");
  script.src = `${normalizedBaseUrl}${pluginName}/index.min.js`;
  document.head.append(script);
  return script;
}

export function setBodyHtml(markup: string): void {
  document.body.innerHTML = markup;
}

export function renderArticle(
  markup: string,
  options: {
    tagName?: keyof HTMLElementTagNameMap;
  } = {},
): HTMLElement {
  const { tagName = "div" } = options;

  setBodyHtml(`<${tagName} id="article">${markup}</${tagName}>`);
  return getRequiredElement(document, "#article", HTMLElement);
}

export function renderArticleView(
  markup: string,
  options: {
    tagName?: keyof HTMLElementTagNameMap;
  } = {},
): HTMLElement {
  const { tagName = "div" } = options;

  setBodyHtml(`<${tagName} class="article-view">${markup}</${tagName}>`);
  return getRequiredElement(document, ".article-view", HTMLElement);
}

export function getRequiredElement<T extends Element>(
  parent: ParentNode,
  selector: string,
  ctor: RequiredElementCtor<T>,
): T {
  const element = parent.querySelector(selector);

  if (!(element instanceof ctor)) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

export function getRequiredElements<T extends Element>(
  parent: ParentNode,
  selector: string,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

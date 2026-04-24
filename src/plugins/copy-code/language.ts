const LANGUAGE_ATTRIBUTE_NAMES = [
  "data-language",
  "data-code-language",
  "data-ke-language",
  "lang",
] as const;
const LANGUAGE_CLASS_PATTERNS = [/^language-(.+)$/i, /^lang-(.+)$/i] as const;
const KNOWN_LANGUAGE_LABELS = {
  bash: "SH",
  c: "C",
  "c#": "C#",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  dockerfile: "DOCKER",
  go: "GO",
  gql: "GQL",
  graphql: "GQL",
  htm: "HTML",
  html: "HTML",
  ini: "INI",
  java: "JAVA",
  js: "JS",
  javascript: "JS",
  json: "JSON",
  jsx: "JSX",
  kt: "KT",
  kotlin: "KT",
  less: "LESS",
  lua: "LUA",
  markdown: "MD",
  md: "MD",
  mdx: "MDX",
  objectivec: "OBJ-C",
  "objective-c": "OBJ-C",
  php: "PHP",
  plaintext: "TXT",
  powershell: "PS",
  py: "PY",
  python: "PY",
  rb: "RB",
  rs: "RS",
  ruby: "RB",
  rust: "RS",
  sass: "SASS",
  scss: "SCSS",
  shell: "SH",
  sh: "SH",
  sql: "SQL",
  svg: "SVG",
  swift: "SWIFT",
  toml: "TOML",
  text: "TXT",
  ts: "TS",
  tsx: "TSX",
  txt: "TXT",
  typescript: "TS",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zsh: "SH",
} as const;
const KNOWN_LANGUAGE_NAMES = new Set(Object.keys(KNOWN_LANGUAGE_LABELS));

const DEFAULT_LANGUAGE_LABEL = "Code";

function sanitizeLanguageToken(token: string): string {
  return token
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[;:,.]+$/g, "")
    .toLowerCase();
}

function isValidLanguageToken(token: string): boolean {
  return /^[a-z0-9][a-z0-9#+._-]*$/i.test(token);
}

function getLanguageTokenFromValue(
  value: string,
  options: {
    allowUnknownToken: boolean;
  },
): string | null {
  const brushMatch = value.match(/brush:\s*([a-z0-9#+._-]+)/i);
  if (brushMatch) {
    return sanitizeLanguageToken(brushMatch[1]);
  }

  for (const rawToken of value.split(/\s+/)) {
    const token = sanitizeLanguageToken(rawToken);
    if (!token) continue;

    for (const pattern of LANGUAGE_CLASS_PATTERNS) {
      const match = token.match(pattern);
      if (match) {
        return sanitizeLanguageToken(match[1]);
      }
    }

    if (KNOWN_LANGUAGE_NAMES.has(token)) {
      return token;
    }
  }

  const normalizedValue = sanitizeLanguageToken(value);

  if (
    options.allowUnknownToken &&
    normalizedValue &&
    isValidLanguageToken(normalizedValue)
  ) {
    return normalizedValue;
  }

  return null;
}

function formatLanguageLabel(language: string | null): string {
  if (!language) return DEFAULT_LANGUAGE_LABEL;

  const normalizedLanguage = sanitizeLanguageToken(language);
  if (!normalizedLanguage) return DEFAULT_LANGUAGE_LABEL;

  const knownLabel =
    KNOWN_LANGUAGE_LABELS[
      normalizedLanguage as keyof typeof KNOWN_LANGUAGE_LABELS
    ];
  if (knownLabel) return knownLabel;

  return normalizedLanguage
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 4).toUpperCase())
    .join("-");
}

export function getLanguageLabel(pre: HTMLElement): string {
  const code = pre.querySelector<HTMLElement>("code");
  const elements = [pre, code].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  );

  for (const element of elements) {
    for (const attributeName of LANGUAGE_ATTRIBUTE_NAMES) {
      const value = element.getAttribute(attributeName);
      if (!value) continue;

      const language = getLanguageTokenFromValue(value, {
        allowUnknownToken: true,
      });
      if (language) {
        return formatLanguageLabel(language);
      }
    }
  }

  for (const element of elements) {
    const language = getLanguageTokenFromValue(element.className, {
      allowUnknownToken: false,
    });
    if (language) {
      return formatLanguageLabel(language);
    }
  }

  return DEFAULT_LANGUAGE_LABEL;
}

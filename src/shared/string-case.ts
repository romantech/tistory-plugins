export const STRING_CASES = ["kebab", "snake", "camel", "pascal"] as const;

export type StringCase = (typeof STRING_CASES)[number];

function splitWords(value: string): string[] {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";
}

export function toCamelCase(words: readonly string[]): string {
  const [first = "", ...rest] = words;
  return first.toLowerCase() + rest.map(capitalize).join("");
}

export function toPascalCase(words: readonly string[]): string {
  return words.map(capitalize).join("");
}

export function toSnakeCase(words: readonly string[]): string {
  return words.map((word) => word.toLowerCase()).join("_");
}

export function toKebabCase(words: readonly string[]): string {
  return words.map((word) => word.toLowerCase()).join("-");
}

const CASE_TRANSFORMS: Record<
  StringCase,
  (words: readonly string[]) => string
> = {
  kebab: toKebabCase,
  snake: toSnakeCase,
  camel: toCamelCase,
  pascal: toPascalCase,
};

export function convertCases(
  value: string,
  targetCases: readonly StringCase[] = STRING_CASES,
): string[] {
  const words = splitWords(value);

  if (words.length === 0) return [value];

  return [
    ...new Set(
      targetCases.map((targetCase) => CASE_TRANSFORMS[targetCase](words)),
    ),
  ];
}

export function getSelectorVariants(
  selector: string,
  targetCases: readonly StringCase[] = STRING_CASES,
): string[] {
  const prefix = selector.at(0);

  if (prefix !== "." && prefix !== "#") return [selector];

  const name = selector.slice(1);
  const variants = convertCases(name, targetCases).map(
    (converted) => `${prefix}${converted}`,
  );

  return [...new Set([selector, ...variants])];
}

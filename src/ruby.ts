export const ENGLISH_WORD_PATTERN = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;

export function isEnglishWord(value: string): boolean {
  return ENGLISH_WORD_PATTERN.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeAnnotation(value: string, stripTrailingPunctuation = true): string {
  const normalized = value
    .trim()
    .replace(/^(["'“‘「『])|(["'”’」』])$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripTrailingPunctuation
    ? normalized.replace(/[。.!！]+$/g, "").trim()
    : normalized;
}

export function createRubyMarkup(
  source: string,
  annotation: string,
  position: "over" | "under" = "over"
): string {
  return `<ruby class="ruby-translator-${position}">${escapeHtml(source)}<rt>${escapeHtml(annotation)}</rt></ruby>`;
}

export const SUMMARY_START = "<!-- ruby-translator-summary:start -->";
export const SUMMARY_END = "<!-- ruby-translator-summary:end -->";

export interface TranslationAnnotation {
  source: string;
  translation: string;
}

export interface SummaryUpdate {
  start: number;
  end: number;
  replacement: string;
}

export function extractAnnotations(content: string): TranslationAnnotation[] {
  const sourceWithoutSummary = removeSummary(content);
  const annotations: TranslationAnnotation[] = [];
  const seen = new Set<string>();
  const rubyPattern = /<ruby\b[^>]*>([\s\S]*?)<rt\b[^>]*>([\s\S]*?)<\/rt>\s*<\/ruby>/gi;

  let match: RegExpExecArray | null;
  while ((match = rubyPattern.exec(sourceWithoutSummary)) !== null) {
    const source = decodeHtml(stripTags(match[1] ?? "")).trim();
    const translation = decodeHtml(stripTags(match[2] ?? "")).trim();
    if (!source || !translation) continue;
    const key = `${source}\u0000${translation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    annotations.push({ source, translation });
  }

  return annotations;
}

export function buildSummary(annotations: TranslationAnnotation[]): string {
  const entries = annotations
    .map(
      ({ source, translation }) =>
        `- **${escapeMarkdown(source)}**：${escapeMarkdown(translation)}`
    )
    .join("\n");

  return `${SUMMARY_START}\n## 翻译注释汇总\n\n${entries}\n${SUMMARY_END}`;
}

export function planSummaryUpdate(content: string): SummaryUpdate | null {
  const annotations = extractAnnotations(content);
  const range = findSummaryRange(content);

  if (annotations.length === 0) {
    return range ? { ...range, replacement: "" } : null;
  }

  const summary = buildSummary(annotations);
  if (range) {
    const current = content.slice(range.start, range.end);
    return current === summary ? null : { ...range, replacement: summary };
  }

  const prefix = content.length === 0 ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return {
    start: content.length,
    end: content.length,
    replacement: `${prefix}${summary}`
  };
}

function findSummaryRange(content: string): { start: number; end: number } | null {
  const start = content.indexOf(SUMMARY_START);
  if (start < 0) return null;
  const endMarker = content.indexOf(SUMMARY_END, start + SUMMARY_START.length);
  if (endMarker < 0) return null;
  return { start, end: endMarker + SUMMARY_END.length };
}

function removeSummary(content: string): string {
  const range = findSummaryRange(content);
  return range ? content.slice(0, range.start) + content.slice(range.end) : content;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]{}<>#])/g, "\\$1");
}

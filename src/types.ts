export type TranslationProvider = "google" | "openai-compatible";
export type AnnotationPosition = "over" | "under";
export type FloatingButtonMode = "mobile" | "always" | "off";

export interface RubyTranslatorSettings {
  provider: TranslationProvider;
  targetLanguage: string;
  defaultPosition: AnnotationPosition;
  allowSentences: boolean;
  floatingButton: FloatingButtonMode;
  autoAppendSummary: boolean;
  annotationsHidden: boolean;
  useCustomAnnotationColor: boolean;
  annotationColor: string;
  googleApiKey: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiPrompt: string;
  aiSentencePrompt: string;
}

export const DEFAULT_SETTINGS: RubyTranslatorSettings = {
  provider: "google",
  targetLanguage: "zh-CN",
  defaultPosition: "over",
  allowSentences: true,
  floatingButton: "mobile",
  autoAppendSummary: true,
  annotationsHidden: false,
  useCustomAnnotationColor: false,
  annotationColor: "#d97706",
  googleApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiApiKey: "",
  aiModel: "gpt-4.1-mini",
  aiPrompt:
    "Translate the English word into {{language}}. Return only the shortest natural dictionary gloss, with no quotes, explanation, punctuation, or Markdown. Word: {{text}}",
  aiSentencePrompt:
    "Translate the following English phrase or sentence naturally into {{language}} so that its meaning and usage in context are clear. Return only the translation, with no explanation, labels, quotes, or Markdown. Text: {{text}}"
};

import { requestUrl } from "obsidian";
import { isEnglishWord, normalizeAnnotation } from "./ruby";
import type { RubyTranslatorSettings } from "./types";

interface GoogleResponse {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
  error?: { message?: string };
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
}

export async function translateText(
  text: string,
  settings: RubyTranslatorSettings
): Promise<string> {
  const raw =
    settings.provider === "google"
      ? await translateWithGoogle(text, settings)
      : await translateWithOpenAiCompatible(text, settings);

  const normalized = normalizeAnnotation(decodeHtmlEntities(raw), isEnglishWord(text));
  if (!normalized) {
    throw new Error("翻译服务返回了空结果");
  }
  return normalized;
}

async function translateWithGoogle(
  text: string,
  settings: RubyTranslatorSettings
): Promise<string> {
  if (!settings.googleApiKey.trim()) {
    throw new Error("请先在插件设置中填写 Google Cloud Translation API Key");
  }

  const response = await requestUrl({
    url: `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(settings.googleApiKey.trim())}`,
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({
      q: text,
      source: "en",
      target: settings.targetLanguage,
      format: "text"
    }),
    throw: false
  });

  const body = response.json as GoogleResponse;
  if (response.status < 200 || response.status >= 300) {
    throw new Error(body.error?.message ?? `Google 翻译请求失败（HTTP ${response.status}）`);
  }

  const translated = body.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error("Google 翻译没有返回结果");
  return translated;
}

async function translateWithOpenAiCompatible(
  text: string,
  settings: RubyTranslatorSettings
): Promise<string> {
  const baseUrl = settings.aiBaseUrl.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("请先填写 AI API Base URL");
  if (!settings.aiModel.trim()) throw new Error("请先填写 AI 模型名称");

  const promptTemplate = isEnglishWord(text) ? settings.aiPrompt : settings.aiSentencePrompt;
  const prompt = promptTemplate
    .replaceAll("{{language}}", settings.targetLanguage)
    .replaceAll("{{text}}", text);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.aiApiKey.trim()) {
    headers.Authorization = `Bearer ${settings.aiApiKey.trim()}`;
  }

  const response = await requestUrl({
    url: `${baseUrl}/chat/completions`,
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.aiModel.trim(),
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    }),
    throw: false
  });

  const body = response.json as ChatCompletionResponse;
  if (response.status < 200 || response.status >= 300) {
    throw new Error(body.error?.message ?? `AI 翻译请求失败（HTTP ${response.status}）`);
  }

  const translated = body.choices?.[0]?.message?.content;
  if (!translated) throw new Error("AI 翻译没有返回结果");
  return translated;
}

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

import {
  Editor,
  MarkdownView,
  Menu,
  Notice,
  Plugin,
  setIcon,
  type EditorPosition
} from "obsidian";
import { createRubyMarkup, isEnglishWord } from "./ruby";
import { RubyTranslatorSettingTab } from "./settings";
import { translateText } from "./translator";
import { extractAnnotations, planSummaryUpdate } from "./summary";
import {
  DEFAULT_SETTINGS,
  type AnnotationPosition,
  type RubyTranslatorSettings
} from "./types";

const MAX_SELECTION_LENGTH = 500;

export default class RubyTranslatorPlugin extends Plugin {
  settings!: RubyTranslatorSettings;
  private ribbonButtonEl?: HTMLElement;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new RubyTranslatorSettingTab(this.app, this));
    this.applyAnnotationVisibility();
    this.applyAnnotationStyle();

    this.ribbonButtonEl = this.addRibbonIcon(
      "eye-off",
      "隐藏翻译注释",
      () => void this.toggleAnnotationVisibility()
    );
    this.updateRibbonButton();

    this.addCommand({
      id: "annotate-selection-with-translation",
      icon: "languages",
      name: "按默认位置添加翻译注释",
      editorCheckCallback: (checking, editor) => {
        if (!editor.somethingSelected()) return false;
        if (!checking) void this.annotateSelection(editor, this.settings.defaultPosition);
        return true;
      }
    });

    this.addCommand({
      id: "rebuild-annotation-summary",
      icon: "list-restart",
      name: "重建当前文档的翻译注释汇总",
      editorCallback: (editor) => {
        const count = this.refreshSummary(editor);
        new Notice(count > 0 ? `已汇总 ${count} 条翻译注释` : "当前文档没有翻译注释");
      }
    });

    this.addCommand({
      id: "toggle-annotation-visibility",
      icon: "eye-off",
      name: "隐藏或恢复所有翻译注释",
      callback: () => void this.toggleAnnotationVisibility()
    });

    this.addCommand({
      id: "annotate-selection-above",
      icon: "arrow-up-to-line",
      name: "给选中的英文添加上方翻译",
      editorCheckCallback: (checking, editor) => {
        if (!editor.somethingSelected()) return false;
        if (!checking) void this.annotateSelection(editor, "over");
        return true;
      }
    });

    this.addCommand({
      id: "annotate-selection-below",
      icon: "arrow-down-to-line",
      name: "给选中的英文添加下方翻译",
      editorCheckCallback: (checking, editor) => {
        if (!editor.somethingSelected()) return false;
        if (!checking) void this.annotateSelection(editor, "under");
        return true;
      }
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        if (!editor.somethingSelected()) return;
        menu.addItem((item) =>
          item
            .setTitle("翻译注释到上方")
            .setIcon("arrow-up")
            .onClick(() => void this.annotateSelection(editor, "over"))
        );
        menu.addItem((item) =>
          item
            .setTitle("翻译注释到下方")
            .setIcon("arrow-down")
            .onClick(() => void this.annotateSelection(editor, "under"))
        );
      })
    );
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<RubyTranslatorSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    document.body.classList.remove("ruby-translator-hide-annotations");
    document.body.classList.remove("ruby-translator-custom-color");
    document.body.style.removeProperty("--ruby-translator-annotation-color");
  }

  applyAnnotationVisibility(): void {
    document.body.classList.toggle(
      "ruby-translator-hide-annotations",
      this.settings.annotationsHidden
    );
    this.updateRibbonButton();
  }

  applyAnnotationStyle(): void {
    document.body.classList.toggle(
      "ruby-translator-custom-color",
      this.settings.useCustomAnnotationColor
    );
    document.body.style.setProperty(
      "--ruby-translator-annotation-color",
      this.settings.annotationColor
    );
  }

  private async annotateSelection(
    editor: Editor,
    position: AnnotationPosition,
    _view?: MarkdownView
  ): Promise<void> {
    const rawSelection = editor.getSelection();
    const source = rawSelection.trim();
    if (!source) {
      new Notice("请先选中英文单词、短语或句子");
      return;
    }
    // 手机上拖动选区时常会多选到首尾的空格，这里自动去掉
    let from = editor.getCursor("from");
    let to = editor.getCursor("to");
    if (source !== rawSelection) {
      const lead = rawSelection.length - rawSelection.trimStart().length;
      const trail = rawSelection.length - rawSelection.trimEnd().length;
      from = editor.offsetToPos(editor.posToOffset(from) + lead);
      to = editor.offsetToPos(editor.posToOffset(to) - trail);
      editor.setSelection(from, to);
    }
    if (source.includes("\n")) {
      new Notice("短语或句子注释不能跨越多个段落");
      return;
    }
    if (source.length > MAX_SELECTION_LENGTH) {
      new Notice(`选区不能超过 ${MAX_SELECTION_LENGTH} 个字符`);
      return;
    }
    if (!/[A-Za-z]/.test(source)) {
      new Notice("选区中没有英文内容");
      return;
    }
    if (!this.settings.allowSentences && !isEnglishWord(source)) {
      new Notice("当前设置只允许注释单个英文单词");
      return;
    }
    if (this.selectionIsInsideRuby(editor)) {
      new Notice("所选文字已经位于 ruby 注释中");
      return;
    }

    new Notice(`正在查询“${source}”…`, 2500);

    try {
      const annotation = await translateText(source, this.settings);
      if (editor.getRange(from, to) !== source) {
        new Notice("查词期间原选区发生了变化，已取消写入", 6000);
        return;
      }
      const markup = createRubyMarkup(source, annotation, position);
      editor.replaceRange(markup, from, to);
      editor.setCursor(advancePosition(from, markup));
      if (this.settings.autoAppendSummary) this.refreshSummary(editor);
      new Notice(`${source} → ${annotation}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`注释失败：${message}`, 8000);
      console.error("Ruby Translator:", error);
    }
  }

  private selectionIsInsideRuby(editor: Editor): boolean {
    const from = editor.getCursor("from");
    const before = editor.getLine(from.line).slice(0, from.ch);
    return before.lastIndexOf("<ruby") > before.lastIndexOf("</ruby>");
  }

  private refreshSummary(editor: Editor): number {
    const content = editor.getValue();
    const update = planSummaryUpdate(content);
    if (update) {
      editor.replaceRange(
        update.replacement,
        editor.offsetToPos(update.start),
        editor.offsetToPos(update.end)
      );
    }

    const nextContent = update
      ? content.slice(0, update.start) + update.replacement + content.slice(update.end)
      : content;
    return extractAnnotations(nextContent).length;
  }

  private async toggleAnnotationVisibility(): Promise<void> {
    this.settings.annotationsHidden = !this.settings.annotationsHidden;
    this.applyAnnotationVisibility();
    await this.saveSettings();
    new Notice(this.settings.annotationsHidden ? "已隐藏所有翻译注释" : "已恢复所有翻译注释");
  }

  private updateRibbonButton(): void {
    if (!this.ribbonButtonEl || !this.settings) return;
    const hidden = this.settings.annotationsHidden;
    setIcon(this.ribbonButtonEl, hidden ? "eye" : "eye-off");
    this.ribbonButtonEl.setAttribute("aria-label", hidden ? "恢复翻译注释" : "隐藏翻译注释");
  }
}

function advancePosition(from: EditorPosition, inserted: string): EditorPosition {
  const lines = inserted.split("\n");
  if (lines.length === 1) return { line: from.line, ch: from.ch + inserted.length };
  return { line: from.line + lines.length - 1, ch: lines[lines.length - 1]?.length ?? 0 };
}

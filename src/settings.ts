import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type RubyTranslatorPlugin from "./main";
import { translateText } from "./translator";
import type { AnnotationPosition } from "./types";

export class RubyTranslatorSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: RubyTranslatorPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("翻译服务")
      .setDesc("选择自动查词时使用的服务。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("google", "Google Cloud Translation")
          .addOption("openai-compatible", "OpenAI 兼容 API")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            this.plugin.settings.provider = value as "google" | "openai-compatible";
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("目标语言")
      .setDesc("Google 使用语言代码；AI 会把此值放入提示词，例如 zh-CN、繁体中文、日语。")
      .addText((text) =>
        text
          .setPlaceholder("zh-CN")
          .setValue(this.plugin.settings.targetLanguage)
          .onChange(async (value) => {
            this.plugin.settings.targetLanguage = value.trim() || "zh-CN";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("默认注释位置")
      .setDesc("命令面板使用此位置；右键菜单可以每次单独选择上方或下方。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("over", "原文上方")
          .addOption("under", "原文下方")
          .setValue(this.plugin.settings.defaultPosition)
          .onChange(async (value) => {
            this.plugin.settings.defaultPosition = value as AnnotationPosition;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("允许短语和句子")
      .setDesc("开启后可注释同一段落内最多 500 个字符的英文短语或句子。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.allowSentences).onChange(async (value) => {
          this.plugin.settings.allowSentences = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("自动维护文末汇总")
      .setDesc("每次添加翻译注释后，在当前文档末尾更新去重后的注释列表。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoAppendSummary).onChange(async (value) => {
          this.plugin.settings.autoAppendSummary = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("隐藏行内注释")
      .setDesc("与左侧眼睛按钮相同；只隐藏显示效果，不删除 Markdown 中的注释。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.annotationsHidden).onChange(async (value) => {
          this.plugin.settings.annotationsHidden = value;
          this.plugin.applyAnnotationVisibility();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("使用自定义注释颜色")
      .setDesc("开启后，上方和下方的翻译注释使用下方选定的颜色。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useCustomAnnotationColor).onChange(async (value) => {
          this.plugin.settings.useCustomAnnotationColor = value;
          this.plugin.applyAnnotationStyle();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("注释文字颜色")
      .setDesc("修改 ruby 上方或下方的译文颜色，选择后立即预览。")
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.annotationColor).onChange(async (value) => {
          this.plugin.settings.annotationColor = value;
          this.plugin.settings.useCustomAnnotationColor = true;
          this.plugin.applyAnnotationStyle();
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.provider === "google") {
      this.renderGoogleSettings(containerEl);
    } else {
      this.renderAiSettings(containerEl);
    }

    new Setting(containerEl)
      .setName("测试当前配置")
      .setDesc("用单词 example 测试服务，不会修改笔记。")
      .addButton((button) =>
        button.setButtonText("测试").onClick(async () => {
          button.setDisabled(true);
          try {
            const result = await translateText("example", this.plugin.settings);
            new Notice(`测试成功：example → ${result}`);
          } catch (error) {
            new Notice(`测试失败：${errorMessage(error)}`, 8000);
          } finally {
            button.setDisabled(false);
          }
        })
      );

    containerEl.createEl("p", {
      cls: "ruby-translator-security-note",
      text: "隐私提示：选中的文字会发送到你选择的翻译服务。API Key 保存在当前仓库的插件数据中，请勿将该数据公开提交。"
    });
  }

  private renderGoogleSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("Google API Key")
      .setDesc("需在 Google Cloud 中启用 Cloud Translation API（Basic v2）。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("AIza…")
          .setValue(this.plugin.settings.googleApiKey)
          .onChange(async (value) => {
            this.plugin.settings.googleApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });
  }

  private renderAiSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("兼容 Chat Completions 的地址；插件会追加 /chat/completions。")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.aiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.aiBaseUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("本地服务不需要 Key 时可留空。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-…")
          .setValue(this.plugin.settings.aiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.aiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("模型")
      .addText((text) =>
        text
          .setPlaceholder("gpt-4.1-mini")
          .setValue(this.plugin.settings.aiModel)
          .onChange(async (value) => {
            this.plugin.settings.aiModel = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("提示词")
      .setDesc("单个英文单词使用的提示词。可使用 {{text}} 与 {{language}} 占位符。")
      .addTextArea((text) => {
        text.inputEl.rows = 6;
        text.inputEl.addClass("ruby-translator-prompt");
        text.setValue(this.plugin.settings.aiPrompt).onChange(async (value) => {
          this.plugin.settings.aiPrompt = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("短语和句子提示词")
      .setDesc("多词选区使用的提示词，用于给出符合上下文的自然翻译。")
      .addTextArea((text) => {
        text.inputEl.rows = 6;
        text.inputEl.addClass("ruby-translator-prompt");
        text.setValue(this.plugin.settings.aiSentencePrompt).onChange(async (value) => {
          this.plugin.settings.aiSentencePrompt = value;
          await this.plugin.saveSettings();
        });
      });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

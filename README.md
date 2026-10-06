# Ruby Translator for Obsidian

选中英文单词、短语或句子后，通过编辑器右键菜单自动翻译，并把选区替换为 HTML ruby 注释：

```html
<ruby>example<rt>例子</rt></ruby>
```

在阅读模式中，`例子` 会显示在 `example` 上方。

## 功能

- 编辑器右键菜单：`注释：自动翻译为上方文字`
- 每次可选择把翻译放在原文上方或下方
- 支持同一段落内最多 500 个字符的短语和句子
- 自动在文末维护去重后的“翻译注释汇总”
- 左侧眼睛按钮一键隐藏或恢复所有行内 ruby 注释
- 可自定义注释文字颜色，选择后立即预览
- 命令面板可随时重建当前文档的注释汇总
- 命令面板：`Ruby Translator: 给选中的英文添加上方翻译`
- Google Cloud Translation Basic v2
- OpenAI 兼容的 Chat Completions API，可配置 Base URL、模型与提示词
- 可在设置中关闭短语和句子，只允许单个英文单词
- 请求期间若原选区已被修改，则取消写入，避免覆盖新内容
- 支持桌面端和移动端（手机上可把命令加到编辑工具栏，见下文）

## 安装

**通过 BRAT（推荐）**

1. 安装并启用社区插件 [BRAT](https://github.com/TfTHacker/obsidian42-brat)。
2. 在 BRAT 中选择 *Add Beta plugin*，填入 `Unclesam-13/obsidian-ruby-translator`。
3. 在“设置 → 第三方插件”中启用 **Ruby Translator**。

**手动安装**

1. 从 [Releases](https://github.com/Unclesam-13/obsidian-ruby-translator/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放到 `<你的仓库>/.obsidian/plugins/ruby-translator/`。
3. 重启 Obsidian，在“设置 → 第三方插件”中启用 **Ruby Translator**。
4. 在插件设置里选择翻译服务并填写 API 配置。

**从源码构建**

```bash
npm install
npm run build
```

然后把生成的 `main.js` 和 `manifest.json`、`styles.css` 一起复制到上面的插件目录。

## 在手机上使用

插件不依赖桌面端功能，所有网络请求都走 Obsidian 自带的接口，iOS 和 Android 都可以用。

手机上一般弹不出电脑那样的右键菜单，推荐把命令加到编辑工具栏：

1. 打开「设置 → 移动端 → 管理工具栏选项」（Settings → Mobile → Manage toolbar options）。
2. 在命令列表里找到 **Ruby Translator** 的命令并添加，常用的有：
   - 给选中的英文添加上方翻译
   - 给选中的英文添加下方翻译
   - 隐藏或恢复所有翻译注释
3. 之后选中英文，点工具栏上对应的按钮即可。

也可以从命令面板运行这些命令。选区首尾多选到的空格会被自动去掉。

## 翻译服务配置

### Google Cloud Translation

在 Google Cloud 项目中启用 Cloud Translation API，创建 API Key，然后在插件设置中填写。插件调用官方 Basic v2 REST 接口。

### OpenAI 兼容 API

默认 Base URL 为 `https://api.openai.com/v1`。任何兼容 `POST /chat/completions` 的服务均可使用；本地服务不需要鉴权时，API Key 可以留空。

## 隐私与安全

- 只有你主动执行注释时，选中的文字才会发送到所选服务。
- 插件不收集分析数据。
- API Key 由 Obsidian 保存在该插件的 `data.json` 中。请不要把它提交到公开仓库或分享给他人。

## 开发

```bash
npm install
npm test
npm run build
```

## 发布新版本

1. 修改 `manifest.json`、`package.json`、`versions.json` 中的版本号。
2. 更新 `.github/release-notes.md`。
3. 推送到 `main`。GitHub Actions 会运行测试、构建，并在该版本还没有 Release 时自动创建，附上 `main.js`、`manifest.json`、`styles.css`。

## License

MIT

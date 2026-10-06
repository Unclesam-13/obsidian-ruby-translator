import { MarkdownView, Platform, setIcon, type App, type Editor } from "obsidian";
import type { AnnotationPosition, FloatingButtonMode } from "./types";

const MAX_LENGTH = 500;

/**
 * 选中英文后，在选区下方显示一个小浮动条（译↑ / 译↓）。
 * 手机上系统的选区菜单无法加入插件按钮，这个浮动条就是手机上的主要入口。
 */
export class FloatingTranslateButton {
  private el: HTMLElement | null = null;
  private timer: number | null = null;
  private busy = false;

  constructor(
    private readonly app: App,
    private readonly getMode: () => FloatingButtonMode,
    private readonly onTranslate: (editor: Editor, position: AnnotationPosition) => Promise<void>
  ) {}

  /** 选区、滚动、键盘弹出等变化后调用，稍作延迟再更新位置 */
  schedule(delay = 180): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.update();
    }, delay);
  }

  hide(): void {
    this.el?.removeClass("is-visible");
  }

  destroy(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.el?.remove();
    this.el = null;
  }

  private enabled(): boolean {
    const mode = this.getMode();
    if (mode === "off") return false;
    if (mode === "mobile") return Platform.isMobile;
    return true;
  }

  private activeEditor(): Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.getMode() !== "source") return null;
    return view.editor;
  }

  private update(): void {
    if (this.busy) return;
    if (!this.enabled()) {
      this.hide();
      return;
    }
    const editor = this.activeEditor();
    if (!editor || !editor.somethingSelected()) {
      this.hide();
      return;
    }
    const text = editor.getSelection().trim();
    if (!text || text.length > MAX_LENGTH || text.includes("\n") || !/[A-Za-z]/.test(text)) {
      this.hide();
      return;
    }
    const rect = this.selectionRect(editor);
    if (!rect) {
      this.hide();
      return;
    }
    this.show(rect);
  }

  /** 选区的屏幕位置：优先用 CodeMirror 计算，失败时退回浏览器选区 */
  private selectionRect(editor: Editor): { top: number; bottom: number; left: number; right: number } | null {
    // Obsidian 的 Editor 内部带有 CodeMirror 6 的 EditorView
    const cm = (editor as unknown as { cm?: { coordsAtPos(pos: number): { top: number; bottom: number; left: number; right: number } | null } }).cm;
    if (cm && typeof cm.coordsAtPos === "function") {
      try {
        const fromPos = editor.posToOffset(editor.getCursor("from"));
        const toPos = editor.posToOffset(editor.getCursor("to"));
        const a = cm.coordsAtPos(fromPos);
        const b = cm.coordsAtPos(toPos);
        if (a && b) {
          return {
            top: Math.min(a.top, b.top),
            bottom: Math.max(a.bottom, b.bottom),
            left: Math.min(a.left, b.left),
            right: Math.max(a.right, b.right)
          };
        }
      } catch (error) {
        console.debug("Ruby Translator: coordsAtPos failed", error);
      }
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r.width || r.height) return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }
    return null;
  }

  private ensureEl(): HTMLElement {
    if (this.el) return this.el;
    const el = document.body.createDiv({ cls: "ruby-translator-fab" });
    const make = (position: AnnotationPosition, icon: string, label: string) => {
      const btn = el.createEl("button", { attr: { "aria-label": label, type: "button" } });
      setIcon(btn.createSpan({ cls: "ruby-translator-fab-icon" }), icon);
      btn.createSpan({ text: label });
      // pointerdown 时阻止默认行为，避免编辑器失去焦点、选区被取消
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.run(position);
      });
      btn.addEventListener("mousedown", (event) => event.preventDefault());
      btn.addEventListener("touchstart", (event) => event.preventDefault(), { passive: false });
    };
    make("over", "arrow-up-to-line", "译到上方");
    make("under", "arrow-down-to-line", "译到下方");
    this.el = el;
    return el;
  }

  private async run(position: AnnotationPosition): Promise<void> {
    if (this.busy) return;
    const editor = this.activeEditor();
    if (!editor || !editor.somethingSelected()) {
      this.hide();
      return;
    }
    this.busy = true;
    this.el?.addClass("is-busy");
    try {
      await this.onTranslate(editor, position);
    } finally {
      this.busy = false;
      this.el?.removeClass("is-busy");
      this.hide();
    }
  }

  private show(rect: { top: number; bottom: number; left: number; right: number }): void {
    const el = this.ensureEl();
    el.addClass("is-visible");
    const vv = window.visualViewport;
    const viewTop = vv ? vv.offsetTop : 0;
    const viewHeight = vv ? vv.height : window.innerHeight;
    const viewWidth = vv ? vv.width : window.innerWidth;
    const width = el.offsetWidth || 200;
    const height = el.offsetHeight || 40;
    const gap = Platform.isMobile ? 14 : 8;

    // 默认放在选区下方（系统选区菜单一般在上方），放不下再放到上方
    let top = rect.bottom + gap;
    if (top + height > viewTop + viewHeight - 8) top = rect.top - height - gap;
    top = Math.max(viewTop + 8, Math.min(top, viewTop + viewHeight - height - 8));
    let left = (rect.left + rect.right) / 2 - width / 2;
    left = Math.max(8, Math.min(left, viewWidth - width - 8));
    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
  }
}

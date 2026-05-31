import type { Editor } from "@tiptap/react";

export interface LinkFormState {
  url: string;
  text: string;
  /** 编辑已有链接或选中文本时的替换范围 */
  range: { from: number; to: number } | null;
  /** 是否正在编辑已有链接 */
  isEditing: boolean;
}

/** 读取当前选区/链接，用于打开链接对话框 */
export function readLinkFormState(editor: Editor): LinkFormState {
  const { from, to, empty } = editor.state.selection;

  if (editor.isActive("link")) {
    editor.chain().focus().extendMarkRange("link").run();
    const sel = editor.state.selection;
    return {
      url: (editor.getAttributes("link").href as string) ?? "",
      text: editor.state.doc.textBetween(sel.from, sel.to, " "),
      range: { from: sel.from, to: sel.to },
      isEditing: true,
    };
  }

  if (!empty) {
    return {
      url: "https://",
      text: editor.state.doc.textBetween(from, to, " "),
      range: { from, to },
      isEditing: false,
    };
  }

  return { url: "https://", text: "", range: null, isEditing: false };
}

/** 将链接写入编辑器（支持自定义显示文本） */
export function applyLinkToEditor(
  editor: Editor,
  url: string,
  text: string,
  range: { from: number; to: number } | null
): void {
  const href = url.trim();
  const label = text.trim();

  if (!href) {
    if (range) {
      editor.chain().focus().setTextSelection(range).unsetLink().run();
    }
    return;
  }

  const display = label || href;
  const node = {
    type: "text" as const,
    text: display,
    marks: [{ type: "link" as const, attrs: { href } }],
  };

  if (range) {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContentAt(range.from, node)
      .run();
    return;
  }

  editor.chain().focus().insertContent(node).run();
}

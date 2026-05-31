import { Extension } from "@tiptap/core";

/** 编辑器快捷键：保存、链接及常用格式（与 StarterKit 内置快捷键互补） */
export function createEditorShortcuts(onSave: () => void, onOpenLinkDialog: () => void) {
  return Extension.create({
    name: "editorShortcuts",
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        "Mod-s": () => {
          onSave();
          return true;
        },
        "Mod-k": () => {
          onOpenLinkDialog();
          return true;
        },
        "Mod-Shift-7": () => this.editor.chain().focus().toggleOrderedList().run(),
        "Mod-Shift-8": () => this.editor.chain().focus().toggleBulletList().run(),
        "Mod-Shift-9": () => this.editor.chain().focus().toggleBlockquote().run(),
        "Mod-Alt-c": () => this.editor.chain().focus().toggleCodeBlock().run(),
        "Mod-Alt-1": () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
        "Mod-Alt-2": () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "Mod-Alt-3": () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      };
    },
  });
}

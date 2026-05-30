import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import PlaceholderExt from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Image, Tag, X } from "lucide-react";
import { db } from "../lib/db";
import type { Note } from "../types";

interface Props {
  note: Note;
  userId: string;
  onSave: (patch: Partial<Note>) => void;
}

const TOOLBAR = (editor: ReturnType<typeof useEditor>) =>
  editor
    ? [
        { label: "B",   cls: "font-bold",            active: editor.isActive("bold"),              cmd: () => editor.chain().focus().toggleBold().run() },
        { label: "I",   cls: "italic",               active: editor.isActive("italic"),            cmd: () => editor.chain().focus().toggleItalic().run() },
        { label: "S",   cls: "line-through text-xs", active: editor.isActive("strike"),            cmd: () => editor.chain().focus().toggleStrike().run() },
        { label: "`",   cls: "font-mono text-xs",    active: editor.isActive("code"),              cmd: () => editor.chain().focus().toggleCode().run() },
        { label: "H1",  cls: "text-xs",              active: editor.isActive("heading",{level:1}), cmd: () => editor.chain().focus().toggleHeading({level:1}).run() },
        { label: "H2",  cls: "text-xs",              active: editor.isActive("heading",{level:2}), cmd: () => editor.chain().focus().toggleHeading({level:2}).run() },
        { label: "H3",  cls: "text-xs",              active: editor.isActive("heading",{level:3}), cmd: () => editor.chain().focus().toggleHeading({level:3}).run() },
        { label: "UL",  cls: "text-xs",              active: editor.isActive("bulletList"),        cmd: () => editor.chain().focus().toggleBulletList().run() },
        { label: "OL",  cls: "text-xs",              active: editor.isActive("orderedList"),       cmd: () => editor.chain().focus().toggleOrderedList().run() },
        { label: "☑",   cls: "text-xs",              active: editor.isActive("taskList"),          cmd: () => editor.chain().focus().toggleTaskList().run() },
        { label: '❝',   cls: "text-xs",              active: editor.isActive("blockquote"),        cmd: () => editor.chain().focus().toggleBlockquote().run() },
        { label: "</>", cls: "font-mono text-xs",    active: editor.isActive("codeBlock"),         cmd: () => editor.chain().focus().toggleCodeBlock().run() },
      ]
    : [];

export default function Editor({ note, userId, onSave }: Props) {
  const [title, setTitle] = useState(note.title);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(note.tags);

  useEffect(() => { setTitle(note.title); setTags(note.tags); }, [note.id, note.title, note.tags]);

  const editor = useEditor({
    extensions: [
      StarterKit, Markdown, ImageExt,
      LinkExt.configure({ openOnClick: false }),
      PlaceholderExt.configure({ placeholder: "开始记录… 支持完整 Markdown 语法" }),
      TaskList, TaskItem.configure({ nested: true }),
    ],
    content: note.content,
    editorProps: { attributes: { class: "prose-note min-h-[60vh] px-1 py-2" } },
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown() as string;
      onSave({ content: md, title, tags });
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setContent(note.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(",", "");
      if (!tags.includes(t)) {
        const next = [...tags, t];
        setTags(next);
        onSave({ title, tags: next });
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    onSave({ title, tags: next });
  };

  const insertImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await db.uploadImage(userId, file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch { alert("图片上传失败"); }
    };
    input.click();
  }, [editor, userId]);

  if (!editor) return null;
  const md = editor.storage.markdown.getMarkdown() as string;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 标题 */}
      <div className="px-8 pt-8 pb-3 border-b border-gray-100">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onSave({ title, tags })}
          placeholder="笔记标题"
          className="w-full text-2xl font-bold text-gray-800 outline-none bg-transparent placeholder-gray-300"
        />
        <div className="flex flex-wrap items-center gap-1.5 mt-3 min-h-[24px]">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
              <Tag className="w-3 h-3" />{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
            </span>
          ))}
          <input
            value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
            placeholder="添加标签 Enter 确认…"
            className="text-xs text-gray-400 outline-none bg-transparent min-w-[100px] placeholder-gray-300"
          />
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-gray-100 flex-wrap">
        {TOOLBAR(editor).map(({ label, cmd, active, cls }) => (
          <button
            key={label}
            onMouseDown={(e) => { e.preventDefault(); cmd(); }}
            className={`px-2 py-1 rounded text-sm transition-colors ${cls} ${active ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
          >{label}</button>
        ))}
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button onMouseDown={(e) => { e.preventDefault(); insertImage(); }} className="p-1.5 rounded text-gray-500 hover:bg-gray-100" title="插入图片">
          <Image className="w-4 h-4" />
        </button>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <EditorContent editor={editor} />
      </div>

      {/* 状态栏 */}
      <div className="px-8 py-1.5 text-xs text-gray-300 border-t border-gray-100 flex justify-between">
        <span>{new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
        <span>{md.length} 字符</span>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import PlaceholderExt from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Columns2, Eye, FileDown, FolderOpen, Image, PencilLine, RotateCcw, Table2, Tag, Trash2, X } from "lucide-react";
import { db } from "../lib/db";
import { exportNoteToPdf } from "../lib/exportPdf";
import { extractHeadings, type TocItem } from "../lib/headings";
import { renderMarkdownToHtml } from "../lib/markdownRender";
import { renderMermaidIn } from "../lib/mermaidRender";
import TocPanel from "./TocPanel";
import type { Folder, Note } from "../types";

type ViewMode = "edit" | "split" | "preview";

function getClipboardImageFile(cd: DataTransfer): File | null {
  if (cd.files.length > 0) {
    const file = cd.files[0];
    if (file.type.startsWith("image/")) return file;
  }
  for (const item of cd.items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

/** 粘贴：截图/图片走 uploadImage；纯文本走块级 Markdown 解析 */
function createContentPasteExtension(userId: string) {
  return Extension.create({
    name: "contentPaste",
    priority: 1000,
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [
        new Plugin({
          key: new PluginKey("contentPaste"),
          props: {
            handlePaste: (view, event) => {
              const cd = event.clipboardData;
              if (!cd) return false;

              const imageFile = getClipboardImageFile(cd);
              if (imageFile) {
                event.preventDefault();
                void (async () => {
                  try {
                    const url = await db.uploadImage(userId, imageFile);
                    editor.chain().focus().setImage({ src: url }).run();
                  } catch {
                    alert("图片上传失败");
                  }
                })();
                return true;
              }

              const text = cd.getData("text/plain");
              if (!text || cd.files.length > 0) return false;

              const html = editor.storage.markdown.parser.parse(text) as string;
              const dom = document.createElement("div");
              dom.innerHTML = html;
              const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(dom, {
                preserveWhitespace: false,
              });
              view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
              return true;
            },
          },
        }),
      ];
    },
  });
}

interface Props {
  note: Note;
  userId: string;
  folders: Folder[];
  onSave: (patch: Partial<Note>) => void;
  readOnly?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

function folderSelectOptions(folders: Folder[], parentId: string | null = null, depth = 0): { id: string; label: string }[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .flatMap((f) => [
      { id: f.id, label: `${"　".repeat(depth)}${f.name}` },
      ...folderSelectOptions(folders, f.id, depth + 1),
    ]);
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

export default function Editor({ note, userId, folders, onSave, readOnly = false, onRestore, onPermanentDelete }: Props) {
  const [title, setTitle] = useState(note.title);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(note.tags);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [exporting, setExporting] = useState(false);
  const [previewMd, setPreviewMd] = useState(note.content);

  useEffect(() => { setTitle(note.title); setTags(note.tags); }, [note.id, note.title, note.tags]);

  const contentPasteExt = useMemo(() => createContentPasteExtension(userId), [userId]);

  const editor = useEditor({
    extensions: [
      StarterKit, Markdown, contentPasteExt, ImageExt,
      LinkExt.configure({ openOnClick: false }),
      PlaceholderExt.configure({ placeholder: "开始记录… 支持完整 Markdown 语法" }),
      TaskList, TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
    ],
    content: note.content,
    editable: !readOnly,
    editorProps: { attributes: { class: "prose-note min-h-[60vh] px-1 py-2" } },
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown() as string;
      setPreviewMd(md);
      onSave({ content: md, title, tags });
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(note.content ?? "");
      setPreviewMd(editor.storage.markdown.getMarkdown() as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (readOnly) setViewMode("preview");
  }, [readOnly, note.id]);

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

  const previewRef = useRef<HTMLDivElement>(null);
  const md = previewMd;
  const headings = useMemo(() => extractHeadings(md), [md]);

  const scrollToHeading = useCallback((item: TocItem) => {
    if (!editor) return;
    if (viewMode !== "preview") scrollToHeadingInEditor(editor, item.index);
    if (viewMode !== "edit") {
      previewRef.current
        ?.querySelector(`#${CSS.escape(item.id)}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editor, viewMode]);

  const handleExportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportNoteToPdf({ title, content: md, tags });
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF 导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }, [exporting, title, md, tags]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {readOnly && (
        <div className="flex items-center justify-between gap-3 px-8 py-2.5 bg-amber-50 border-b border-amber-100 text-sm text-amber-800">
          <span>此笔记在回收站中，仅可预览</span>
          <div className="flex items-center gap-2">
            {onRestore && (
              <button
                onClick={onRestore}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                恢复
              </button>
            )}
            {onPermanentDelete && (
              <button
                onClick={onPermanentDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                彻底删除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 标题 */}
      <div className="px-8 pt-8 pb-3 border-b border-gray-100">
        <input
          value={title}
          readOnly={readOnly}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => !readOnly && onSave({ title, tags })}
          placeholder="笔记标题"
          className={`w-full text-2xl font-bold text-gray-800 outline-none bg-transparent placeholder-gray-300 ${readOnly ? "cursor-default" : ""}`}
        />
        <div className="flex flex-wrap items-center gap-1.5 mt-3 min-h-[24px]">
          {!readOnly && folders.length > 0 && (
            <label className="flex items-center gap-1 text-xs text-gray-500 mr-1">
              <FolderOpen className="w-3 h-3 flex-shrink-0" />
              <select
                value={note.folderId ?? ""}
                onChange={(e) => onSave({ folderId: e.target.value || null })}
                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-600 outline-none hover:border-blue-300"
              >
                <option value="">未分类</option>
                {folderSelectOptions(folders).map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
          )}
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
              <Tag className="w-3 h-3" />{tag}
              {!readOnly && (
                <button onClick={() => removeTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
              )}
            </span>
          ))}
          {!readOnly && (
            <input
              value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="添加标签 Enter 确认…"
              className="text-xs text-gray-400 outline-none bg-transparent min-w-[100px] placeholder-gray-300"
            />
          )}
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-gray-100 flex-wrap">
        {!readOnly && viewMode !== "preview" && TOOLBAR(editor).map(({ label, cmd, active, cls }) => (
          <button
            key={label}
            onMouseDown={(e) => { e.preventDefault(); cmd(); }}
            className={`px-2 py-1 rounded text-sm transition-colors ${cls} ${active ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
          >{label}</button>
        ))}
        {!readOnly && viewMode !== "preview" && (
          <>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button onMouseDown={(e) => { e.preventDefault(); insertImage(); }} className="p-1.5 rounded text-gray-500 hover:bg-gray-100" title="插入图片">
              <Image className="w-4 h-4" />
            </button>
            <TableMenu editor={editor} />
          </>
        )}

        {/* 导出 PDF */}
        <button
          onClick={() => void handleExportPdf()}
          disabled={exporting}
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          title="导出 PDF"
        >
          <FileDown className="w-4 h-4" />
        </button>

        {/* 视图切换 */}
        {!readOnly && (
          <div className="ml-auto flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5">
            {([
              { mode: "edit" as ViewMode,    icon: <PencilLine className="w-3.5 h-3.5" />, title: "编辑" },
              { mode: "split" as ViewMode,   icon: <Columns2   className="w-3.5 h-3.5" />, title: "分栏" },
              { mode: "preview" as ViewMode, icon: <Eye        className="w-3.5 h-3.5" />, title: "预览" },
            ] as const).map(({ mode, icon, title: t }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={t}
                className={`p-1 rounded transition-colors ${viewMode === mode ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >{icon}</button>
            ))}
          </div>
        )}
      </div>

      {/* 编辑区 / 预览区 */}
      <div className="flex flex-1 overflow-hidden">
        {headings.length > 0 && (
          <TocPanel items={headings} onSelect={scrollToHeading} />
        )}

        {/* 编辑面板 */}
        {viewMode !== "preview" && (
          <div className={`overflow-y-auto px-8 py-4 ${viewMode === "split" ? "w-1/2 border-r border-gray-100" : "flex-1"}`}>
            <EditorContent editor={editor} />
          </div>
        )}

        {/* 预览面板 */}
        {viewMode !== "edit" && (
          <div ref={previewRef} className={viewMode === "split" ? "w-1/2 overflow-hidden" : "flex-1 overflow-hidden"}>
            <MarkdownPreview md={md} className="h-full" />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="px-8 py-1.5 text-xs text-gray-300 border-t border-gray-100 flex justify-between">
        <span>{new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
        <span>{md.length} 字符</span>
      </div>
    </div>
  );
}

function TableMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  if (!editor) return null;

  const inTable = editor.isActive("table");

  const actions = inTable
    ? [
        { label: "在上方插入行", cmd: () => editor.chain().focus().addRowBefore().run() },
        { label: "在下方插入行", cmd: () => editor.chain().focus().addRowAfter().run() },
        { label: "删除当前行",   cmd: () => editor.chain().focus().deleteRow().run() },
        { label: "─", cmd: () => {} },
        { label: "在左侧插入列", cmd: () => editor.chain().focus().addColumnBefore().run() },
        { label: "在右侧插入列", cmd: () => editor.chain().focus().addColumnAfter().run() },
        { label: "删除当前列",   cmd: () => editor.chain().focus().deleteColumn().run() },
        { label: "─", cmd: () => {} },
        { label: "删除表格",     cmd: () => editor.chain().focus().deleteTable().run() },
      ]
    : [
        { label: "插入 3×3 表格", cmd: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { label: "插入 4×4 表格", cmd: () => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
      ];

  return (
    <div className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className={`p-1.5 rounded text-gray-500 hover:bg-gray-100 ${inTable ? "bg-blue-100 text-blue-700" : ""}`}
        title="表格"
      >
        <Table2 className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {actions.map(({ label, cmd }, i) =>
              label === "─"
                ? <div key={i} className="border-t border-gray-100 my-1" />
                : (
                  <button
                    key={label}
                    onMouseDown={(e) => { e.preventDefault(); cmd(); setOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >{label}</button>
                )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function scrollToHeadingInEditor(editor: TiptapEditor, index: number) {
  let i = 0;
  let targetPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      if (i === index) {
        targetPos = pos;
        return false;
      }
      i++;
    }
  });
  if (targetPos !== null) {
    editor.chain().focus().setTextSelection(targetPos + 1).scrollIntoView().run();
  }
}

function MarkdownPreview({ md, className = "" }: { md: string; className?: string }) {
  const html = useMemo(() => renderMarkdownToHtml(md), [md]);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cancelled) await renderMermaidIn(root);
    };
    void run();
    return () => { cancelled = true; };
  }, [html]);

  return (
    <div
      ref={ref}
      className={`preview-note overflow-y-auto px-8 py-4 bg-gray-50/50 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

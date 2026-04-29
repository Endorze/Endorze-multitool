"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  FileText,
  Italic,
  List,
  ListOrdered,
  Plus,
  Redo2,
  Save,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { useTabHistory } from "@/providers/TabHistoryProvider";

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

const STORAGE_KEY = "task-calendar-local-notes";

const TEXT_STYLES = {
  p: {
    label: "Normal text",
    fontSize: "16",
    fontWeight: "400",
    lineHeight: "1.75",
  },
  h1: {
    label: "Title",
    fontSize: "40",
    fontWeight: "700",
    lineHeight: "1.2",
  },
  h2: {
    label: "Heading",
    fontSize: "28",
    fontWeight: "700",
    lineHeight: "1.3",
  },
  h3: {
    label: "Subheading",
    fontSize: "22",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  blockquote: {
    label: "Quote",
    fontSize: "18",
    fontWeight: "400",
    lineHeight: "1.7",
  },
} as const;

type TextStyleKey = keyof typeof TEXT_STYLES;

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: "Untitled note",
    content: `<div class="note-page"><p><br></p></div>`,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeContent(content: string) {
  if (content.includes("note-page")) return content;
  return `<div class="note-page">${content || "<p><br></p>"}</div>`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\u200B/g, "").trim();
}

function getSafeFileName(title: string) {
  return title.trim() || "Untitled note";
}

function downloadHtmlFile(note: Note) {
  const safeTitle = getSafeFileName(note.title);

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        background: #f1f5f9;
        font-family: Arial, sans-serif;
      }

      .note-page {
        width: 794px;
        height: 1123px;
        margin: 32px auto;
        padding: 96px 88px;
        background: white;
        box-sizing: border-box;
        overflow: hidden;
      }
    </style>
  </head>
  <body>${note.content.replace(/\u200B/g, "")}</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadTextFile(note: Note) {
  const safeTitle = getSafeFileName(note.title);
  const plainText = stripHtml(note.content);

  const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function ToolbarButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--line)] bg-[var(--panel-soft)] transition hover:bg-[var(--panel-strong)]"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function NotepadTool({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const onBackRef = useRef(onBack);
  const onCloseRef = useRef(onClose);
  const { setTitlebarOverride } = useTabHistory();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<TextStyleKey>("p");
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [selectedFontSize, setSelectedFontSize] = useState("16");

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setTitlebarOverride({
      title: "Notepad",
      subtitle: "Local rich-text editor",
      onBack: () => onBackRef.current(),
      onClose: () => onCloseRef.current(),
    });

    return () => {
      setTitlebarOverride(null);
    };
  }, [setTitlebarOverride]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        const firstNote = createNote();
        setNotes([firstNote]);
        setSelectedNoteId(firstNote.id);
        return;
      }

      const parsed = JSON.parse(raw) as Note[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        const firstNote = createNote();
        setNotes([firstNote]);
        setSelectedNoteId(firstNote.id);
        return;
      }

      setNotes(
        parsed.map((note) => ({
          ...note,
          content: normalizeContent(note.content),
        }))
      );

      setSelectedNoteId(parsed[0].id);
    } catch {
      const firstNote = createNote();
      setNotes([firstNote]);
      setSelectedNoteId(firstNote.id);
    }
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  const selectedNote = useMemo(() => {
    return notes.find((note) => note.id === selectedNoteId) ?? notes[0] ?? null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!editorRef.current || !selectedNote) return;

    const nextHtml = normalizeContent(selectedNote.content);

    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [selectedNote?.id]);

  function addNote() {
    const note = createNote();
    setNotes((current) => [note, ...current]);
    setSelectedNoteId(note.id);
  }

  function updateSelectedNote(changes: Partial<Pick<Note, "title" | "content">>) {
    if (!selectedNote) return;

    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id
          ? { ...note, ...changes, updatedAt: new Date().toISOString() }
          : note
      )
    );
  }

  function deleteSelectedNote() {
    if (!selectedNote) return;

    setNotes((current) => {
      const next = current.filter((note) => note.id !== selectedNote.id);

      if (next.length === 0) {
        const replacement = createNote();
        setSelectedNoteId(replacement.id);
        return [replacement];
      }

      setSelectedNoteId(next[0].id);
      return next;
    });
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function saveEditorContent() {
    updateSelectedNote({ content: editorRef.current?.innerHTML ?? "" });
  }

  function getSelectionInsideEditor() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return null;
    }

    return { selection, range };
  }

  function getCurrentPage() {
    const selectionData = getSelectionInsideEditor();
    if (!selectionData) return null;

    let node: Node | null = selectionData.range.commonAncestorContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    return (node as HTMLElement | null)?.closest(".note-page") as HTMLElement | null;
  }

  function placeCaretAtStart(element: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(element);
    range.collapse(true);

    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function placeCaretAtEnd(element: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(element);
    range.collapse(false);

    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function createPageAfterCurrent() {
    const currentPage = getCurrentPage();

    if (!currentPage) return;

    const nextPage = document.createElement("div");
    nextPage.className = "note-page";
    nextPage.innerHTML = "<p><br></p>";

    currentPage.after(nextPage);
    placeCaretAtStart(nextPage);
    saveEditorContent();

    nextPage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function createPageAfter(page: HTMLElement) {
    const nextPage = document.createElement("div");
    nextPage.className = "note-page";
    nextPage.innerHTML = "<p><br></p>";

    page.after(nextPage);

    return nextPage;
  }

  function getOrCreateNextPage(page: HTMLElement) {
    const nextElement = page.nextElementSibling;

    if (nextElement && nextElement.classList.contains("note-page")) {
      return nextElement as HTMLElement;
    }

    return createPageAfter(page);
  }

  function isPageOverflowing(page: HTMLElement) {
    return page.scrollHeight > page.clientHeight + 2;
  }

  function moveOverflowToNextPage(page: HTMLElement) {
    if (!isPageOverflowing(page)) return;

    const nextPage = getOrCreateNextPage(page);
    const movedNodes: Node[] = [];

    while (isPageOverflowing(page) && page.lastChild) {
      const nodeToMove = page.lastChild;

      if (
        page.childNodes.length <= 1 &&
        nodeToMove.textContent?.trim().length
      ) {
        break;
      }

      movedNodes.unshift(nodeToMove);
      nextPage.insertBefore(nodeToMove, nextPage.firstChild);
    }

    if (page.innerHTML.trim() === "") {
      page.innerHTML = "<p><br></p>";
    }

    if (nextPage.innerHTML.trim() === "") {
      nextPage.innerHTML = "<p><br></p>";
    }

    if (movedNodes.length > 0) {
      placeCaretAtEnd(nextPage);
      nextPage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function repaginateFromCurrentPage() {
    const currentPage = getCurrentPage();

    if (!currentPage) return;

    let page: HTMLElement | null = currentPage;

    while (page) {
      moveOverflowToNextPage(page);

      const next = page.nextElementSibling;

      if (!next || !next.classList.contains("note-page")) {
        break;
      }

      page = next as HTMLElement;
    }

    saveEditorContent();
  }

  function applyInlineStyle(style: Partial<CSSStyleDeclaration>) {
    focusEditor();

    const selectionData = getSelectionInsideEditor();
    if (!selectionData) return;

    const { selection, range } = selectionData;
    const span = document.createElement("span");

    Object.assign(span.style, style);

    if (range.collapsed) {
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild as Text, 1);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);

      saveEditorContent();
      return;
    }

    const selectedContent = range.extractContents();
    span.appendChild(selectedContent);
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);

    selection.removeAllRanges();
    selection.addRange(newRange);

    saveEditorContent();
  }

  function runCommand(command: string, value?: string) {
    focusEditor();
    document.execCommand(command, false, value);
    saveEditorContent();

    window.requestAnimationFrame(() => {
      repaginateFromCurrentPage();
    });
  }

  function applyTextStyle(style: TextStyleKey) {
    const config = TEXT_STYLES[style];

    setSelectedStyle(style);
    setSelectedFontSize(config.fontSize);

    applyInlineStyle({
      fontSize: `${config.fontSize}px`,
      fontWeight: config.fontWeight,
      lineHeight: config.lineHeight,
    });

    window.requestAnimationFrame(() => {
      repaginateFromCurrentPage();
    });
  }

  function applyFont(font: string) {
    setSelectedFont(font);
    applyInlineStyle({ fontFamily: font });

    window.requestAnimationFrame(() => {
      repaginateFromCurrentPage();
    });
  }

  function applyFontSize(size: string) {
    setSelectedFontSize(size);
    applyInlineStyle({ fontSize: `${size}px` });

    window.requestAnimationFrame(() => {
      repaginateFromCurrentPage();
    });
  }

  function handleEditorInput() {
    saveEditorContent();

    window.requestAnimationFrame(() => {
      repaginateFromCurrentPage();
    });
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      createPageAfterCurrent();
    }
  }

  return (
    <div className="fixed left-0 right-0 top-10 bottom-0 z-[90] overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {selectedNote ? (
            <>
              <input
                value={selectedNote.title}
                onChange={(event) =>
                  updateSelectedNote({ title: event.target.value })
                }
                placeholder="File name..."
                className="h-14 shrink-0 border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 text-lg font-semibold outline-none"
              />

              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-3">
                <select
                  value={selectedStyle}
                  onChange={(event) =>
                    applyTextStyle(event.target.value as TextStyleKey)
                  }
                  className="theme-input h-9 max-w-[130px] px-2 text-sm outline-none"
                >
                  <option value="p">Normal text</option>
                  <option value="h1">Title</option>
                  <option value="h2">Heading</option>
                  <option value="h3">Subheading</option>
                  <option value="blockquote">Quote</option>
                </select>

                <select
                  value={selectedFont}
                  onChange={(event) => applyFont(event.target.value)}
                  className="theme-input h-9 max-w-[120px] px-2 text-sm outline-none"
                >
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times</option>
                  <option value="Courier New">Courier</option>
                  <option value="Verdana">Verdana</option>
                </select>

                <select
                  value={selectedFontSize}
                  onChange={(event) => applyFontSize(event.target.value)}
                  className="theme-input h-9 max-w-[70px] px-2 text-sm outline-none"
                >
                  <option value="10">10</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="22">22</option>
                  <option value="24">24</option>
                  <option value="28">28</option>
                  <option value="32">32</option>
                  <option value="40">40</option>
                  <option value="48">48</option>
                  <option value="64">64</option>
                </select>

                <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />

                <ToolbarButton label="Undo" onClick={() => runCommand("undo")}>
                  <Undo2 className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton label="Redo" onClick={() => runCommand("redo")}>
                  <Redo2 className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />

                <ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
                  <Bold className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton label="Italic" onClick={() => runCommand("italic")}>
                  <Italic className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton
                  label="Underline"
                  onClick={() => runCommand("underline")}
                >
                  <Underline className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />

                <ToolbarButton
                  label="Bullet list"
                  onClick={() => runCommand("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton
                  label="Numbered list"
                  onClick={() => runCommand("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolbarButton>

                <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />

                <ToolbarButton
                  label="Align left"
                  onClick={() => runCommand("justifyLeft")}
                >
                  <AlignLeft className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton
                  label="Align center"
                  onClick={() => runCommand("justifyCenter")}
                >
                  <AlignCenter className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton
                  label="Align right"
                  onClick={() => runCommand("justifyRight")}
                >
                  <AlignRight className="h-4 w-4" />
                </ToolbarButton>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onBlur={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-100 px-3 py-6 text-slate-950 outline-none dark:bg-slate-950/40 dark:text-slate-50 sm:px-6 xl:px-8 [&_.note-page]:mx-auto [&_.note-page]:mb-8 [&_.note-page]:h-[1123px] [&_.note-page]:w-[min(794px,calc(100%-24px))] [&_.note-page]:max-w-full [&_.note-page]:overflow-hidden [&_.note-page]:bg-white [&_.note-page]:px-[clamp(28px,8vw,88px)] [&_.note-page]:py-[clamp(48px,8vw,96px)] [&_.note-page]:text-slate-950 [&_.note-page]:shadow-sm [&_.note-page]:outline [&_.note-page]:outline-1 [&_.note-page]:outline-slate-200 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
              />

              <div className="flex shrink-0 flex-wrap justify-between gap-3 border-t border-[var(--line)] bg-[var(--panel-soft)] px-5 py-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => downloadHtmlFile(selectedNote)}
                    className="theme-button-accent inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
                  >
                    <Save className="h-4 w-4" />
                    Save as .html
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTextFile(selectedNote)}
                    className="theme-button-soft inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
                  >
                    <Save className="h-4 w-4" />
                    Save as .txt
                  </button>
                </div>

                <button
                  type="button"
                  onClick={deleteSelectedNote}
                  className="inline-flex items-center gap-2 border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete note
                </button>
              </div>
            </>
          ) : null}
        </main>

        <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-[var(--line)] bg-[var(--panel-strong)] p-4 backdrop-blur-xl xl:p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center theme-card">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm theme-muted">Saved locally</p>
                <h3 className="truncate text-lg font-semibold">Documents</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={addNote}
              className="inline-flex shrink-0 items-center gap-2 bg-gradient-to-r from-cyan-300 to-indigo-400 px-3 py-2 text-sm font-semibold text-slate-950"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {notes.map((note) => {
              const active = note.id === selectedNote?.id;
              const plainPreview = stripHtml(note.content);

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full border px-4 py-3 text-left transition ${
                    active
                      ? "border-cyan-300/30 bg-cyan-300/15"
                      : "border-[var(--line)] bg-[var(--panel-soft)] hover:bg-[var(--panel-strong)]"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">
                    {note.title.trim() || "Untitled note"}
                  </p>
                  <p className="mt-1 truncate text-xs theme-muted">
                    {plainPreview || "Empty note"}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
"use client";

import { useCallback, useState } from "react";
import {
  Activity,
  Calculator,
  FileSpreadsheet,
  FileText,
  Image,
  Wrench,
  X,
} from "lucide-react";
import NotepadTool from "@/components/notepad-tool";
import SpreadsheetTool from "@/components/spreadsheet-tool";
import DiagnosticsTool from "@/components/diagnostics-tool";

type ToolView =
  | "home"
  | "notepad"
  | "spreadsheet"
  | "diagnostics"
  | "calculator"
  | "gallery";

function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-surface rounded-2xl p-5 text-left transition hover:scale-[1.01]"
    >
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl theme-card">
        {icon}
      </div>

      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 theme-muted">{description}</p>
    </button>
  );
}

export default function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ToolView>("home");

  const openNotepad = useCallback(() => {
    setView("notepad");
  }, []);

  const openSpreadsheet = useCallback(() => {
    setView("spreadsheet");
  }, []);

  const openDiagnostics = useCallback(() => {
    setView("diagnostics");
  }, []);

  const goBackToTools = useCallback(() => {
    setView("home");
  }, []);

  if (view === "notepad") {
    return <NotepadTool onBack={goBackToTools} onClose={onClose} />;
  }

  if (view === "spreadsheet") {
    return <SpreadsheetTool onBack={goBackToTools} onClose={onClose} />;
  }

  if (view === "diagnostics") {
    return <DiagnosticsTool onBack={goBackToTools} onClose={onClose} />;
  }

  return (
    <div className="fixed left-0 right-0 top-10 bottom-0 z-[90] flex items-center justify-center overflow-hidden bg-black/55 px-4 py-6 backdrop-blur-sm">
      <section className="theme-panel flex h-full max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-sm theme-muted">Utility drawer</p>
            <h2 className="text-2xl font-semibold">Tools</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="theme-button-soft grid h-12 w-12 place-items-center rounded-xl"
            aria-label="Close tools"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToolCard
              icon={<FileText className="h-5 w-5" />}
              title="Notepad"
              description="Create local notes, switch between them, autosave, format text, and export."
              onClick={openNotepad}
            />

            <ToolCard
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="Spreadsheet"
              description="Track numbers, budgets, lists, simple formulas, totals, and export as CSV."
              onClick={openSpreadsheet}
            />

            <ToolCard
              icon={<Activity className="h-5 w-5" />}
              title="Diagnostics"
              description="Track active app usage locally and view daily usage stats."
              onClick={openDiagnostics}
            />

            <ToolCard
              icon={<Calculator className="h-5 w-5" />}
              title="Calculator"
              description="A simple desktop calculator can live here next."
              onClick={() => setView("calculator")}
            />

            <ToolCard
              icon={<Image className="h-5 w-5" />}
              title="Image gallery"
              description="Later: local image folders, preview grid, and fullscreen viewer."
              onClick={() => setView("gallery")}
            />

            <ToolCard
              icon={<Wrench className="h-5 w-5" />}
              title="More tools"
              description="Converters, quick links, snippets, clipboard helpers, and more."
              onClick={() => setView("home")}
            />
          </div>
        </main>
      </section>
    </div>
  );
}
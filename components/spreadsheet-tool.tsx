"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import { useTabHistory } from "@/providers/TabHistoryProvider";

type CellMap = Record<string, string>;

type Sheet = {
  id: string;
  name: string;
  cells: CellMap;
  rowCount: number;
  colCount: number;
  updatedAt: string;
};

const STORAGE_KEY = "task-calendar-local-spreadsheets";

const DEFAULT_ROWS = 24;
const DEFAULT_COLS = 10;

function createSheet(): Sheet {
  return {
    id: crypto.randomUUID(),
    name: "Untitled spreadsheet",
    cells: {},
    rowCount: DEFAULT_ROWS,
    colCount: DEFAULT_COLS,
    updatedAt: new Date().toISOString(),
  };
}

function getColumnName(index: number) {
  let name = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function getCellId(rowIndex: number, colIndex: number) {
  return `${getColumnName(colIndex)}${rowIndex + 1}`;
}

function parseCellId(cellId: string) {
  const match = cellId.toUpperCase().match(/^([A-Z]+)(\d+)$/);

  if (!match) return null;

  const letters = match[1];
  const row = Number(match[2]) - 1;

  let col = 0;

  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + letters.charCodeAt(i) - 64;
  }

  return {
    row,
    col: col - 1,
  };
}

function parseNumber(value: string) {
  const normalized = value.replace(",", ".").trim();
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function getRangeCellIds(range: string) {
  const [startRaw, endRaw] = range.split(":");
  const start = parseCellId(startRaw);
  const end = parseCellId(endRaw);

  if (!start || !end) return [];

  const rowStart = Math.min(start.row, end.row);
  const rowEnd = Math.max(start.row, end.row);
  const colStart = Math.min(start.col, end.col);
  const colEnd = Math.max(start.col, end.col);

  const ids: string[] = [];

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      ids.push(getCellId(row, col));
    }
  }

  return ids;
}

function evaluateCell(
  cellId: string,
  cells: CellMap,
  visited = new Set<string>()
): string {
  const raw = cells[cellId] ?? "";

  if (!raw.startsWith("=")) return raw;

  if (visited.has(cellId)) return "#CYCLE";

  visited.add(cellId);

  try {
    const expression = raw.slice(1).trim();

    const functionMatch = expression.match(
      /^(SUM|AVG|AVERAGE|MIN|MAX|COUNT)\(([^)]+)\)$/i
    );

    if (functionMatch) {
      const functionName = functionMatch[1].toUpperCase();
      const argument = functionMatch[2].trim();

      const ids = argument.includes(":")
        ? getRangeCellIds(argument)
        : argument.split(",").map((item) => item.trim().toUpperCase());

      const values = ids.map((id) =>
        parseNumber(evaluateCell(id, cells, new Set(visited)))
      );

      if (functionName === "SUM") {
        return String(values.reduce((total, value) => total + value, 0));
      }

      if (functionName === "AVG" || functionName === "AVERAGE") {
        if (values.length === 0) return "0";
        return String(values.reduce((total, value) => total + value, 0) / values.length);
      }

      if (functionName === "MIN") {
        return String(values.length ? Math.min(...values) : 0);
      }

      if (functionName === "MAX") {
        return String(values.length ? Math.max(...values) : 0);
      }

      if (functionName === "COUNT") {
        return String(values.filter((value) => Number.isFinite(value)).length);
      }
    }

    const safeExpression = expression.replace(/[A-Z]+\d+/gi, (match) => {
      const value = evaluateCell(match.toUpperCase(), cells, new Set(visited));
      return String(parseNumber(value));
    });

    if (!/^[0-9+\-*/().\s]+$/.test(safeExpression)) {
      return "#ERROR";
    }

    const result = Function(`"use strict"; return (${safeExpression});`)();

    if (!Number.isFinite(result)) return "#ERROR";

    return String(result);
  } catch {
    return "#ERROR";
  }
}

function formatDisplayValue(value: string) {
  if (value === "") return "";

  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2).replace(/\.?0+$/, "");
}

function downloadCsv(sheet: Sheet) {
  const rows: string[] = [];

  for (let row = 0; row < sheet.rowCount; row++) {
    const values: string[] = [];

    for (let col = 0; col < sheet.colCount; col++) {
      const cellId = getCellId(row, col);
      const value = evaluateCell(cellId, sheet.cells);
      const escaped = `"${value.replaceAll('"', '""')}"`;

      values.push(escaped);
    }

    rows.push(values.join(","));
  }

  const blob = new Blob([rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${sheet.name.trim() || "spreadsheet"}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-button-soft inline-flex h-9 shrink-0 items-center gap-2 px-3 text-sm font-medium"
    >
      {children}
    </button>
  );
}

export default function SpreadsheetTool({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const onBackRef = useRef(onBack);
  const onCloseRef = useRef(onClose);
  const { setTitlebarOverride } = useTabHistory();

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState("A1");

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setTitlebarOverride({
      title: "Spreadsheet",
      subtitle: "Local workbook",
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
        const firstSheet = createSheet();
        setSheets([firstSheet]);
        setSelectedSheetId(firstSheet.id);
        return;
      }

      const parsed = JSON.parse(raw) as Sheet[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        const firstSheet = createSheet();
        setSheets([firstSheet]);
        setSelectedSheetId(firstSheet.id);
        return;
      }

      setSheets(parsed);
      setSelectedSheetId(parsed[0].id);
    } catch {
      const firstSheet = createSheet();
      setSheets([firstSheet]);
      setSelectedSheetId(firstSheet.id);
    }
  }, []);

  useEffect(() => {
    if (sheets.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
    }
  }, [sheets]);

  const selectedSheet = useMemo(() => {
    return (
      sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheets[0] ?? null
    );
  }, [sheets, selectedSheetId]);

  const selectedCellRawValue = selectedSheet?.cells[selectedCellId] ?? "";
  const selectedCellDisplayValue = selectedSheet
    ? formatDisplayValue(evaluateCell(selectedCellId, selectedSheet.cells))
    : "";

  function addSheet() {
    const sheet = createSheet();

    setSheets((current) => [sheet, ...current]);
    setSelectedSheetId(sheet.id);
    setSelectedCellId("A1");
  }

  function updateSelectedSheet(changes: Partial<Sheet>) {
    if (!selectedSheet) return;

    setSheets((current) =>
      current.map((sheet) =>
        sheet.id === selectedSheet.id
          ? {
              ...sheet,
              ...changes,
              updatedAt: new Date().toISOString(),
            }
          : sheet
      )
    );
  }

  function updateCell(cellId: string, value: string) {
    if (!selectedSheet) return;

    const nextCells = {
      ...selectedSheet.cells,
      [cellId]: value,
    };

    if (value.trim() === "") {
      delete nextCells[cellId];
    }

    updateSelectedSheet({
      cells: nextCells,
    });
  }

  function deleteSelectedSheet() {
    if (!selectedSheet) return;

    setSheets((current) => {
      const next = current.filter((sheet) => sheet.id !== selectedSheet.id);

      if (next.length === 0) {
        const replacement = createSheet();
        setSelectedSheetId(replacement.id);
        setSelectedCellId("A1");
        return [replacement];
      }

      setSelectedSheetId(next[0].id);
      setSelectedCellId("A1");
      return next;
    });
  }

  function clearSheet() {
    if (!selectedSheet) return;

    updateSelectedSheet({
      cells: {},
    });

    setSelectedCellId("A1");
  }

  function addRow() {
    if (!selectedSheet) return;

    updateSelectedSheet({
      rowCount: selectedSheet.rowCount + 1,
    });
  }

  function addColumn() {
    if (!selectedSheet) return;

    updateSelectedSheet({
      colCount: selectedSheet.colCount + 1,
    });
  }

  function fillBudgetTemplate() {
    if (!selectedSheet) return;

    updateSelectedSheet({
      name: selectedSheet.name === "Untitled spreadsheet" ? "Budget tracker" : selectedSheet.name,
      cells: {
        A1: "Category",
        B1: "Planned",
        C1: "Actual",
        D1: "Difference",
        A2: "Rent",
        A3: "Food",
        A4: "Transport",
        A5: "Subscriptions",
        A6: "Other",
        A8: "Total",
        B8: "=SUM(B2:B6)",
        C8: "=SUM(C2:C6)",
        D2: "=B2-C2",
        D3: "=B3-C3",
        D4: "=B4-C4",
        D5: "=B5-C5",
        D6: "=B6-C6",
        D8: "=B8-C8",
      },
    });
  }

  function handleCellKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) {
    if (!selectedSheet) return;

    if (event.key === "Enter") {
      event.preventDefault();
      const nextRow = Math.min(row + 1, selectedSheet.rowCount - 1);
      setSelectedCellId(getCellId(nextRow, col));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const nextCol = event.shiftKey
        ? Math.max(col - 1, 0)
        : Math.min(col + 1, selectedSheet.colCount - 1);

      setSelectedCellId(getCellId(row, nextCol));
      return;
    }
  }

  if (!selectedSheet) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-10 bottom-0 z-[90] overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <input
            value={selectedSheet.name}
            onChange={(event) =>
              updateSelectedSheet({ name: event.target.value })
            }
            placeholder="Spreadsheet name..."
            className="h-14 shrink-0 border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 text-lg font-semibold outline-none"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-3">
            <ToolbarButton onClick={addRow}>
              <Plus className="h-4 w-4" />
              Row
            </ToolbarButton>

            <ToolbarButton onClick={addColumn}>
              <Plus className="h-4 w-4" />
              Column
            </ToolbarButton>

            <ToolbarButton onClick={fillBudgetTemplate}>
              Budget template
            </ToolbarButton>

            <ToolbarButton onClick={() => downloadCsv(selectedSheet)}>
              <Download className="h-4 w-4" />
              CSV
            </ToolbarButton>

            <ToolbarButton onClick={clearSheet}>Clear cells</ToolbarButton>

            <div className="min-w-[120px] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-semibold">
              {selectedCellId}
            </div>

            <input
              value={selectedCellRawValue}
              onChange={(event) =>
                updateCell(selectedCellId, event.target.value)
              }
              placeholder="Type text, number, or formula like =SUM(A1:A5)"
              className="theme-input h-9 min-w-[260px] flex-1 px-3 text-sm outline-none"
            />

            <div className="text-sm theme-muted">
              Result:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {selectedCellDisplayValue || "Empty"}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 dark:bg-slate-950/40">
            <div
              className="grid w-max border border-[var(--line)] bg-[var(--panel-soft)]"
              style={{
                gridTemplateColumns: `48px repeat(${selectedSheet.colCount}, minmax(110px, 1fr))`,
              }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r border-[var(--line)] bg-[var(--panel-strong)]" />

              {Array.from({ length: selectedSheet.colCount }).map((_, col) => (
                <div
                  key={col}
                  className="sticky top-0 z-10 border-b border-r border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-center text-xs font-semibold theme-muted"
                >
                  {getColumnName(col)}
                </div>
              ))}

              {Array.from({ length: selectedSheet.rowCount }).map((_, row) => (
                <>
                  <div
                    key={`row-${row}`}
                    className="sticky left-0 z-10 border-b border-r border-[var(--line)] bg-[var(--panel-strong)] px-2 py-2 text-center text-xs font-semibold theme-muted"
                  >
                    {row + 1}
                  </div>

                  {Array.from({ length: selectedSheet.colCount }).map((_, col) => {
                    const cellId = getCellId(row, col);
                    const rawValue = selectedSheet.cells[cellId] ?? "";
                    const isSelected = selectedCellId === cellId;
                    const displayValue = rawValue.startsWith("=")
                      ? formatDisplayValue(evaluateCell(cellId, selectedSheet.cells))
                      : rawValue;

                    return (
                      <input
                        key={cellId}
                        value={isSelected ? rawValue : displayValue}
                        onFocus={() => setSelectedCellId(cellId)}
                        onChange={(event) => updateCell(cellId, event.target.value)}
                        onKeyDown={(event) => handleCellKeyDown(event, row, col)}
                        className={`h-10 border-b border-r border-[var(--line)] bg-white px-2 text-sm text-slate-950 outline-none dark:bg-slate-900 dark:text-slate-50 ${
                          isSelected
                            ? "ring-2 ring-cyan-400"
                            : "focus:ring-2 focus:ring-cyan-300"
                        }`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--panel-soft)] px-5 py-4">
            <p className="text-sm theme-muted">
              Formulas: <span className="font-semibold">=A1+B1</span>,{" "}
              <span className="font-semibold">=SUM(A1:A5)</span>,{" "}
              <span className="font-semibold">=AVG(A1:A5)</span>,{" "}
              <span className="font-semibold">=MIN(A1:A5)</span>,{" "}
              <span className="font-semibold">=MAX(A1:A5)</span>
            </p>

            <button
              type="button"
              onClick={deleteSelectedSheet}
              className="inline-flex items-center gap-2 border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete spreadsheet
            </button>
          </div>
        </main>

        <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-[var(--line)] bg-[var(--panel-strong)] p-4 backdrop-blur-xl xl:p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center theme-card">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm theme-muted">Saved locally</p>
                <h3 className="truncate text-lg font-semibold">Workbooks</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={addSheet}
              className="inline-flex shrink-0 items-center gap-2 bg-gradient-to-r from-cyan-300 to-indigo-400 px-3 py-2 text-sm font-semibold text-slate-950"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {sheets.map((sheet) => {
              const active = sheet.id === selectedSheet.id;
              const usedCells = Object.keys(sheet.cells).length;

              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => {
                    setSelectedSheetId(sheet.id);
                    setSelectedCellId("A1");
                  }}
                  className={`w-full border px-4 py-3 text-left transition ${
                    active
                      ? "border-cyan-300/30 bg-cyan-300/15"
                      : "border-[var(--line)] bg-[var(--panel-soft)] hover:bg-[var(--panel-strong)]"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">
                    {sheet.name.trim() || "Untitled spreadsheet"}
                  </p>
                  <p className="mt-1 truncate text-xs theme-muted">
                    {usedCells} filled cells · {sheet.rowCount} rows ·{" "}
                    {sheet.colCount} columns
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
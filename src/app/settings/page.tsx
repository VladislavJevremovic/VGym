"use client";

import { useState } from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";
import ErrorBanner from "@/components/ErrorBanner";
import { getErrorMessage } from "@/lib/utils";

export default function SettingsPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleExport = async () => {
    setError("");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "vgym-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirm(true);
    setError("");
    e.target.value = "";
  };

  const handleImportConfirm = async () => {
    if (!pendingFile) return;
    setShowConfirm(false);
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const text = await pendingFile.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(
        `Imported: ${data.imported.exercises} exercises, ${data.imported.routines} routines, ${data.imported.workouts} workouts, ${data.imported.sets} sets`
      );
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <ErrorBanner message={error} />

      {result && (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
          <p className="text-emerald-400 text-sm">{result}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Export Data</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Download all workouts, routines, and exercises as a JSON file.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All Data
        </button>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-2">Import Data</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Import a JSON backup. This replaces all existing data.
        </p>
        <label className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {importing ? "Importing..." : "Import Backup"}
          <input
            type="file"
            accept=".json"
            onChange={handleFilePick}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-white">Replace All Data?</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              This deletes all current workouts, routines, and exercises, replacing them with the imported data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setPendingFile(null); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Replace Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

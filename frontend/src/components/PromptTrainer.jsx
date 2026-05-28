import { Brain, Plus, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { addPromptTrainingNote, fetchPromptSettings, resetPromptSettings, savePromptSettings } from "../services/api.js";

export default function PromptTrainer() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trainingNote, setTrainingNote] = useState("");
  const [message, setMessage] = useState("");

  async function loadPrompt() {
    setLoading(true);
    setMessage("");
    try {
      const data = await fetchPromptSettings();
      setPrompt(data.prompt);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load AI prompt settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const data = await savePromptSettings(prompt);
      setPrompt(data.prompt);
      setMessage("Prompt saved. New signals will use these instructions.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage("");
    try {
      const data = await resetPromptSettings();
      setPrompt(data.prompt);
      setMessage("Prompt restored to Aldric default.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reset prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTrainingNote() {
    setSaving(true);
    setMessage("");
    try {
      const data = await addPromptTrainingNote(trainingNote);
      setPrompt(data.prompt);
      setTrainingNote("");
      setMessage("Training note added to Aldric's active prompt.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add training note.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadPrompt();
  }, []);

  return (
    <section className="terminal-panel p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-400/10 text-violet-200">
            <Brain size={20} />
          </div>
          <div>
            <p className="metric-label">AI Prompt Training</p>
            <h2 className="text-lg font-semibold text-white">Tune Aldric&apos;s trading instructions</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              This trains behavior through saved system instructions. It does not fine-tune model weights. Keep the JSON-only,
              NO_TRADE, stop-loss, and risk-warning rules in the prompt.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoadingSpinner /> : <Save size={16} />}
            Save Prompt
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-4 rounded-lg border border-violet-400/15 bg-violet-400/10 p-4">
          <p className="metric-label text-violet-200">Add Training Note</p>
          <p className="mt-1 text-xs leading-5 text-violet-100/80">
            Add a short lesson, rule, or correction. Aldric will append it to the active prompt while preserving risk laws.
          </p>
          <textarea
            value={trainingNote}
            onChange={(event) => setTrainingNote(event.target.value)}
            placeholder="Example: When XAUUSD spreads are above 35 points during NY open, reduce confidence and prefer NO_TRADE unless HTF trend and structure are exceptionally clear."
            className="mt-3 min-h-28 w-full resize-y rounded-lg border border-violet-300/20 bg-slate-950/80 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-300 focus:ring-2 focus:ring-violet-300/15"
          />
          <button
            onClick={handleAddTrainingNote}
            disabled={loading || saving || !trainingNote.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Add Note
          </button>
        </div>

        {loading ? (
          <div className="grid min-h-48 place-items-center rounded-lg border border-slate-800 bg-slate-950/70 text-slate-300">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              Loading prompt
            </div>
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            spellCheck="false"
            className="min-h-80 w-full resize-y rounded-lg border border-slate-800 bg-slate-950/80 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-300 focus:ring-2 focus:ring-violet-300/15"
          />
        )}
      </div>

      {message && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      )}
    </section>
  );
}

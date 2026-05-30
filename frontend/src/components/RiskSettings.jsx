import { LockKeyhole, SlidersHorizontal } from "lucide-react";

const fields = [
  { key: "accountBalance", label: "Account Balance", min: 1, step: 1, prefix: "$" },
  { key: "riskPercentage", label: "Risk Per Trade", min: 0.1, max: 2, step: 0.1, suffix: "%" },
  { key: "dailyTarget", label: "Optional Daily Target", min: 0, step: 1, prefix: "$" },
  { key: "maxDailyLossPercentage", label: "Max Daily Loss", min: 1, step: 0.5, suffix: "%" }
];

export default function RiskSettings({ value, onChange, timeframe, onTimeframeChange }) {
  function updateField(key, nextValue) {
    onChange({ ...value, [key]: Number(nextValue) });
  }

  return (
    <section className="terminal-panel p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <p className="metric-label">Risk Settings</p>
            <h2 className="text-lg font-semibold text-white">Capital protection rules</h2>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="metric-label">Timeframe</span>
          <select value={timeframe} onChange={(event) => onTimeframeChange(event.target.value)} className="control-input">
            {["1m", "5m", "15m", "1h", "4h", "1d"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <label key={field.key} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <span className="metric-label">{field.label}</span>
            <div className="mt-2 flex items-center rounded-lg border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-300/15">
              {field.prefix && <span className="text-sm text-slate-500">{field.prefix}</span>}
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none"
              />
              {field.suffix && <span className="text-sm text-slate-500">{field.suffix}</span>}
            </div>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
        <LockKeyhole size={15} className="mt-0.5 shrink-0" />
        <span>
          Backend caps dashboard risk at 2%, requires stop loss and take profit, and rejects weak reward-to-risk. MT4 automatic execution uses the separate global, account, EA, and kill-switch gates.
        </span>
      </div>
    </section>
  );
}

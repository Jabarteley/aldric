import { AlertTriangle, Gauge, ShieldAlert } from "lucide-react";

function badgeClass(decision) {
  if (decision === "BUY") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (decision === "SELL") return "border-rose-400/40 bg-rose-400/10 text-rose-200";
  return "border-yellow-400/40 bg-yellow-400/10 text-yellow-100";
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

export default function SignalCard({ signal }) {
  if (!signal) {
    return (
      <section className="terminal-panel p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-300">
            <Gauge size={20} />
          </div>
          <div>
            <p className="metric-label">Latest Signal</p>
            <p className="text-sm text-slate-300">Generate a signal to see Aldric&apos;s risk-managed analysis.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="metric-label">Latest Signal</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded-lg border px-3 py-1 text-sm font-semibold ${badgeClass(signal.decision)}`}>
              {signal.decision}
            </span>
            <span className="text-sm text-slate-400">{signal.symbol} / {signal.timeframe}</span>
          </div>
        </div>
        <div className="min-w-36 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-left sm:text-right">
          <p className="metric-label">Confidence</p>
          <p className="text-3xl font-semibold text-white">
            {signal.confidence}<span className="text-lg text-slate-500">%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-800 lg:grid-cols-5">
        {[
          ["Entry", money(signal.entryPrice), "text-slate-100"],
          ["Stop Loss", money(signal.stopLoss), "text-rose-200"],
          ["Take Profit", money(signal.takeProfit), "text-emerald-200"],
          ["Risk Amount", money(signal.riskAmount), "text-slate-100"],
          ["R:R", `${Number(signal.rewardToRiskRatio || 0).toFixed(2)}:1`, "text-cyan-100"]
        ].map(([label, value, valueClass]) => (
          <div key={label} className="bg-slate-950/80 p-4">
            <p className="metric-label">{label}</p>
            <p className={`mt-1 text-base font-semibold ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-cyan-300" />
            <p className="metric-label">AI Reason</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-200">{signal.reason}</p>
        </div>
        <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-yellow-200" />
            <p className="metric-label text-yellow-200">Risk Warning</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-yellow-50">{signal.riskWarning}</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-400/10 bg-black/15 p-3 text-xs leading-5 text-yellow-100">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{signal.invalidationCondition}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

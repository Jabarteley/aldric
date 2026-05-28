import { Clock3, History, ShieldAlert, Target } from "lucide-react";

function badgeClass(decision) {
  if (decision === "BUY") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (decision === "SELL") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  return "border-yellow-400/30 bg-yellow-400/10 text-yellow-100";
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

function shortCondition(signal) {
  const condition = signal.marketCondition || "UNKNOWN";
  if (condition.length <= 42) return condition;
  return `${condition.slice(0, 42)}...`;
}

function Metric({ label, value, valueClass = "text-slate-100" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <p className="metric-label">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function SignalHistory({ signals }) {
  const noTradeCount = signals.filter((signal) => signal.decision === "NO_TRADE").length;
  const tradeCount = signals.length - noTradeCount;

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-slate-800 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-300">
              <History size={19} />
            </div>
            <div>
              <p className="metric-label">Signal History</p>
              <h2 className="text-lg font-semibold text-white">Recent generated signals</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-96">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
              <p className="metric-label">Total</p>
              <p className="text-lg font-semibold text-white">{signals.length}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
              <p className="metric-label">Trade</p>
              <p className="text-lg font-semibold text-emerald-200">{tradeCount}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
              <p className="metric-label">No Trade</p>
              <p className="text-lg font-semibold text-yellow-100">{noTradeCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {signals.map((signal) => {
          const created = formatDate(signal.createdAt);

          return (
            <article key={signal.id} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${badgeClass(signal.decision)}`}>
                    {signal.decision}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{signal.symbol}</p>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{signal.timeframe || "15m"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} />
                        {created.date} {created.time}
                      </span>
                      <span>{shortCondition(signal)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-2 lg:text-right">
                  <p className="metric-label">Confidence</p>
                  <p className="text-xl font-semibold text-white">{signal.confidence}%</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Entry" value={money(signal.entryPrice)} />
                <Metric label="Stop Loss" value={money(signal.stopLoss)} valueClass="text-rose-200" />
                <Metric label="Take Profit" value={money(signal.takeProfit)} valueClass="text-emerald-200" />
                <Metric label="Risk / Reward" value={`${Number(signal.rewardToRiskRatio || 0).toFixed(2)}:1`} valueClass="text-cyan-100" />
                <Metric label="Risk Amount" value={money(signal.riskAmount)} />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-cyan-300" />
                    <p className="metric-label">Market Read</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{signal.marketCondition || "No condition recorded."}</p>
                </div>
                <div className="rounded-lg border border-yellow-400/15 bg-yellow-400/10 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-yellow-200" />
                    <p className="metric-label text-yellow-200">Risk Note</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-yellow-50">{signal.riskWarning || "Trading involves risk."}</p>
                </div>
              </div>
            </article>
          );
        })}

        {!signals.length && (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-5 py-10 text-center text-slate-400">
            No signals generated yet.
          </div>
        )}
      </div>
    </section>
  );
}

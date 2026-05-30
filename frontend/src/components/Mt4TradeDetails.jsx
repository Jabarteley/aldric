import { Activity, CheckCircle2, CircleDollarSign, Shield, SlidersHorizontal, XCircle } from "lucide-react";

function numberValue(value, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : Math.min(digits, 2)
  });
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function Detail({ label, value, tone = "text-white", compact = false }) {
  return (
    <div className={compact ? "min-w-0" : "rounded-lg border border-slate-800 bg-slate-950/70 p-3"}>
      <p className="metric-label">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value ?? "N/A"}</p>
    </div>
  );
}

function Gate({ label, enabled }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${enabled ? "text-emerald-200" : "text-yellow-100"}`}>
        {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export default function Mt4TradeDetails({ result }) {
  const signal = result?.signal;
  if (!signal) return null;

  const order = result?.order;
  const riskPlan = signal.riskPlan || {};
  const technicalData = signal.technicalData || {};
  const executionMode = result.executionMode || signal.executionMode || {};
  const directionTone =
    signal.decision === "BUY"
      ? "text-emerald-200"
      : signal.decision === "SELL"
        ? "text-rose-200"
        : "text-yellow-100";

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="metric-label">Selected Trade</p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            {signal.symbol || result.selectedSymbol} / <span className={directionTone}>{signal.decision}</span> / {signal.timeframe || result.selectedTimeframe}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{signal.reason}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <Shield size={16} />
          shouldExecute: {String(signal.shouldExecute)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Detail label="Entry Price" value={numberValue(signal.entryPrice, 6)} />
        <Detail label="Stop Loss" value={numberValue(signal.stopLoss, 6)} tone="text-rose-100" />
        <Detail label="Take Profit" value={numberValue(signal.takeProfit, 6)} tone="text-emerald-100" />
        <Detail label="Reward / Risk" value={`${numberValue(signal.rewardToRiskRatio, 2)}R`} tone="text-cyan-100" />
        <Detail label="Lot Size" value={numberValue(order?.lotSize ?? riskPlan.lotSize, 2)} />
        <Detail label="Risk Amount" value={money(signal.riskAmount || riskPlan.riskAmount)} tone="text-yellow-100" />
        <Detail label="Confidence" value={`${numberValue(signal.confidence, 0)}%`} />
        <Detail label="Order Status" value={order?.status || (signal.decision === "NO_TRADE" ? "NO ORDER" : "NOT QUEUED")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Activity size={16} />
            Market Read
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Detail compact label="Condition" value={signal.marketCondition || technicalData.marketCondition} />
            <Detail compact label="Session" value={riskPlan.session || "N/A"} />
            <Detail compact label="ATR" value={numberValue(technicalData.atr, 6)} />
            <Detail compact label="RSI 14" value={numberValue(technicalData.rsi14, 2)} />
            <Detail compact label="EMA 20" value={numberValue(technicalData.ema20, 6)} />
            <Detail compact label="EMA 50" value={numberValue(technicalData.ema50, 6)} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <CircleDollarSign size={16} />
            Risk Plan
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Detail compact label="Balance" value={money(riskPlan.accountBalance)} />
            <Detail compact label="Risk %" value={`${numberValue(riskPlan.riskPercentage, 2)}%`} />
            <Detail compact label="SL Distance" value={numberValue(riskPlan.stopLossDistance, 6)} />
            <Detail compact label="SL Pips" value={numberValue(riskPlan.stopLossPips, 2)} />
            <Detail compact label="Trades Today" value={`${numberValue(riskPlan.tradesToday, 0)} / ${numberValue(riskPlan.maxTradesToday, 0)}`} />
            <Detail compact label="Daily Target" value={money(riskPlan.dailyTarget)} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal size={16} />
            Execution Gates
          </div>
          <div className="space-y-2">
            <Gate label="Global automatic" enabled={executionMode.globalAutoEnabled === true} />
            <Gate label="Account automatic" enabled={executionMode.accountAuto === true} />
            <Gate label="EA local automatic" enabled={executionMode.eaAuto === true} />
            <Gate label="Kill switch off" enabled={executionMode.killSwitch !== true} />
          </div>
        </div>
      </div>

      {!!result.scanSummary?.length && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="metric-label">Scan Summary</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Blocked</th>
                  <th className="py-2 pr-3">Confluence</th>
                  <th className="py-2 pr-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {result.scanSummary.map((item) => (
                  <tr key={item.symbol}>
                    <td className="py-2 pr-3 font-semibold text-white">{item.symbol}</td>
                    <td className={`py-2 pr-3 font-semibold ${item.blocked ? "text-yellow-100" : "text-emerald-200"}`}>{String(item.blocked)}</td>
                    <td className="py-2 pr-3">{item.confluenceCount}</td>
                    <td className="py-2 pr-3">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

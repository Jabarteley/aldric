import { Activity, BarChart3, Triangle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

export default function MarketOverview({ market }) {
  const ticker = market?.ticker;
  const technical = market?.technicalData;
  const candles = market?.candles?.slice(-80).map((candle) => ({
    time: new Date(candle.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    close: candle.close
  }));
  const change = ticker?.priceChangePercent ?? 0;
  const changeClass = change >= 0 ? "text-emerald-300" : "text-rose-300";
  const technicalRows = [
    ["EMA 20", technical?.ema20],
    ["EMA 50", technical?.ema50],
    ["EMA 200", technical?.ema200],
    ["RSI 14", technical?.rsi14],
    ["ATR", technical?.atr],
    ["MACD", technical?.macd?.macd],
    ["Support", technical?.support],
    ["Resistance", technical?.resistance]
  ];

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">BTC/USDT</p>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{market?.interval || "15m"}</span>
              <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">Binance realtime</span>
            </div>
            <p className="mt-1 text-4xl font-semibold text-white">{formatCurrency(ticker?.currentPrice)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["24h Change", `${Number(change).toFixed(2)}%`, changeClass],
            ["24h High", formatCurrency(ticker?.high24h), "text-slate-100"],
            ["24h Low", formatCurrency(ticker?.low24h), "text-slate-100"],
            ["Volume", Number(ticker?.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }), "text-slate-100"]
          ].map(([label, value, valueClass]) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <p className="metric-label">{label}</p>
              <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-80 min-w-0 border-b border-slate-800 p-3 lg:border-b-0 lg:border-r">
          <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={1}>
            <AreaChart data={candles}>
              <defs>
                <linearGradient id="price" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={32} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin", "dataMax"]} tick={{ fill: "#64748b", fontSize: 11 }} width={78} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#cbd5e1" }} />
              <Area type="monotone" dataKey="close" stroke="#22d3ee" fill="url(#price)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <aside className="p-4">
          <div className="flex items-center justify-between">
            <p className="metric-label">Technical State</p>
            <Activity size={16} className="text-cyan-300" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {technicalRows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="metric-label">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="metric-label">Trend / Volatility</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-100">{technical?.trendDirection || "--"}</span>
              <span className="rounded bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-100">{technical?.volatilityCondition || "--"}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Triangle size={13} />
              <span>
                Market condition: <span className="font-semibold text-slate-200">{technical?.marketCondition || "--"}</span>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

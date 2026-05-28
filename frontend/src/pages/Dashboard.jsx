import { AlertCircle, RefreshCcw, ServerCrash, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import MarketOverview from "../components/MarketOverview.jsx";
import PromptTrainer from "../components/PromptTrainer.jsx";
import RiskSettings from "../components/RiskSettings.jsx";
import SignalCard from "../components/SignalCard.jsx";
import SignalHistory from "../components/SignalHistory.jsx";
import { fetchMarket, fetchSignals, generateSignal } from "../services/api.js";

const defaultRiskSettings = {
  accountBalance: 200,
  riskPercentage: 1,
  dailyTarget: 20,
  maxDailyLossPercentage: 5
};

function StatusCard({ title, value, tone = "slate" }) {
  const toneClass = {
    cyan: "text-cyan-200",
    emerald: "text-emerald-200",
    yellow: "text-yellow-100",
    rose: "text-rose-200",
    slate: "text-slate-100"
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
      <p className="metric-label">{title}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function MarketOutage({ message, onRetry, loading }) {
  return (
    <section className="terminal-panel p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-400/10 text-rose-200">
            <ServerCrash size={22} />
          </div>
          <div>
            <p className="metric-label">Realtime Market Feed</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Binance is not reachable from this machine</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {message || "The backend could not fetch real-time Binance data. No fallback or mock data is being used."}
            </p>
          </div>
        </div>
        <button
          onClick={onRetry}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <LoadingSpinner /> : <RefreshCcw size={17} />}
          Retry Feed
        </button>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [market, setMarket] = useState(null);
  const [signals, setSignals] = useState([]);
  const [riskSettings, setRiskSettings] = useState(defaultRiskSettings);
  const [timeframe, setTimeframe] = useState("15m");
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [message, setMessage] = useState("");
  const latestSignal = useMemo(() => signals[0] || null, [signals]);

  async function loadMarket() {
    setLoadingMarket(true);
    setMarketError("");
    try {
      const marketData = await fetchMarket(timeframe);
      setMarket(marketData);
    } catch (error) {
      setMarket(null);
      setMarketError(error.response?.data?.message || "Unable to load real-time market data.");
    } finally {
      setLoadingMarket(false);
    }
  }

  async function loadSignalHistory() {
    setLoadingSignals(true);
    try {
      const signalData = await fetchSignals();
      setSignals(signalData);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load signal history.");
    } finally {
      setLoadingSignals(false);
    }
  }

  async function loadDashboard() {
    setMessage("");
    await Promise.all([loadMarket(), loadSignalHistory()]);
  }

  async function handleGenerateSignal() {
    setGenerating(true);
    setMessage("");
    try {
      const signal = await generateSignal({ ...riskSettings, timeframe });
      setSignals((current) => [signal, ...current.filter((item) => item.id !== signal.id)]);
      await loadMarket();
      setMessage("Signal generated and saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to generate signal.");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [timeframe]);

  const marketCondition = market?.technicalData?.marketCondition || (marketError ? "FEED_OFFLINE" : "LOADING");

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard title="Market Condition" value={marketCondition} tone={marketError ? "rose" : "cyan"} />
          <StatusCard title="Latest Decision" value={latestSignal?.decision || "NO SIGNAL"} tone={latestSignal?.decision === "BUY" ? "emerald" : latestSignal?.decision === "SELL" ? "rose" : "yellow"} />
          <StatusCard title="Risk Per Trade" value={`${riskSettings.riskPercentage}% max 2% enforced`} tone="emerald" />
          <StatusCard title="Execution Mode" value="Manual analysis only" tone="slate" />
        </section>

        <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <AlertCircle size={17} className={marketError ? "text-rose-300" : "text-cyan-300"} />
            <span>{marketError ? "Realtime feed requires Binance connectivity." : "Terminal online. Awaiting risk-managed decisions."}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadDashboard}
              disabled={loadingMarket || loadingSignals || generating}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMarket || loadingSignals ? <LoadingSpinner /> : <RefreshCcw size={17} />}
              Refresh
            </button>
            <button
              onClick={handleGenerateSignal}
              disabled={loadingMarket || generating}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? <LoadingSpinner /> : <Wand2 size={17} />}
              Generate Signal
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">{message}</div>
        )}

        {loadingMarket ? (
          <div className="terminal-panel grid min-h-80 place-items-center p-6">
            <div className="flex items-center gap-3 text-slate-300">
              <LoadingSpinner />
              Loading real-time Binance market data
            </div>
          </div>
        ) : market ? (
          <MarketOverview market={market} />
        ) : (
          <MarketOutage message={marketError} onRetry={loadMarket} loading={loadingMarket} />
        )}

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <RiskSettings
            value={riskSettings}
            onChange={setRiskSettings}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
          <SignalCard signal={latestSignal} />
        </div>

        <PromptTrainer />

        {loadingSignals ? (
          <div className="terminal-panel grid min-h-40 place-items-center p-6">
            <div className="flex items-center gap-3 text-slate-300">
              <LoadingSpinner />
              Loading signal history
            </div>
          </div>
        ) : (
          <SignalHistory signals={signals} />
        )}
      </main>
    </div>
  );
}

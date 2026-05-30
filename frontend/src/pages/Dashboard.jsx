import { AlertCircle, Brain, Cable, CalendarClock, History, LineChart, LogOut, RefreshCcw, ServerCrash, Settings, ShieldCheck, SlidersHorizontal, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import FundamentalsPanel from "../components/FundamentalsPanel.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import MarketOverview from "../components/MarketOverview.jsx";
import Mt4BridgePanel from "../components/Mt4BridgePanel.jsx";
import PromptTrainer from "../components/PromptTrainer.jsx";
import RiskSettings from "../components/RiskSettings.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import SignalCard from "../components/SignalCard.jsx";
import SignalHistory from "../components/SignalHistory.jsx";
import { fetchMarket, fetchMt4State, fetchSignals, generateSignal } from "../services/api.js";

const defaultRiskSettings = {
  accountBalance: 200,
  riskPercentage: 1,
  dailyTarget: 20,
  maxDailyLossPercentage: 5
};

const navigation = [
  { id: "overview", label: "Overview", icon: LineChart },
  { id: "risk", label: "Risk & Signal", icon: SlidersHorizontal },
  { id: "mt4", label: "MT4 Bridge", icon: Cable },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "fundamentals", label: "Fundamentals", icon: CalendarClock },
  { id: "prompt", label: "AI Training", icon: Brain },
  { id: "history", label: "History", icon: History }
];

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

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [market, setMarket] = useState(null);
  const [signals, setSignals] = useState([]);
  const [riskSettings, setRiskSettings] = useState(defaultRiskSettings);
  const [timeframe, setTimeframe] = useState("15m");
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [mt4State, setMt4State] = useState(null);
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

  async function loadSignalHistory({ silent = false } = {}) {
    if (!silent) setLoadingSignals(true);
    try {
      const signalData = await fetchSignals();
      setSignals(signalData);
    } catch (error) {
      if (!silent) setMessage(error.response?.data?.message || "Unable to load signal history.");
    } finally {
      if (!silent) setLoadingSignals(false);
    }
  }

  async function loadMt4State({ silent = false } = {}) {
    try {
      setMt4State(await fetchMt4State("default"));
    } catch (error) {
      if (!silent) setMt4State(null);
    }
  }

  async function loadDashboard() {
    setMessage("");
    await Promise.all([loadMarket(), loadSignalHistory(), loadMt4State()]);
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadSignalHistory({ silent: true });
      loadMt4State({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const marketCondition = market?.technicalData?.marketCondition || (marketError ? "FEED_OFFLINE" : "LOADING");
  const activeTitle = navigation.find((item) => item.id === activeSection)?.label || "Overview";
  const mt4Account = mt4State?.account;
  const mt4ExecutionSettings = mt4State?.executionSettings;
  const mt4GlobalAuto = mt4ExecutionSettings?.globalAutoEnabled === true;
  const mt4AccountAuto = mt4Account?.fullAutoEnabled === true;
  const mt4EaAuto = mt4Account?.eaAutoEnabled === true;
  const mt4KillSwitch = mt4ExecutionSettings?.globalKillSwitch === true || mt4Account?.killSwitch === true;
  const mt4AutoReady = mt4GlobalAuto && mt4AccountAuto && mt4EaAuto && !mt4KillSwitch;
  const executionModeLabel = !mt4Account
    ? "MT4 not loaded"
    : mt4AutoReady
      ? "Automatic active"
      : mt4GlobalAuto && mt4AccountAuto
        ? "Auto gated"
        : mt4GlobalAuto
          ? "Global automatic"
          : "Manual / gated";
  const executionModeTone = mt4AutoReady ? "emerald" : mt4GlobalAuto ? "yellow" : "slate";

  function renderMarketPanel() {
    if (loadingMarket) {
      return (
        <div className="terminal-panel grid min-h-80 place-items-center p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <LoadingSpinner />
            Loading real-time Binance market data
          </div>
        </div>
      );
    }

    if (market) return <MarketOverview market={market} />;
    return <MarketOutage message={marketError} onRetry={loadMarket} loading={loadingMarket} />;
  }

  function renderSection() {
    if (activeSection === "overview") {
      return (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard title="Market Condition" value={marketCondition} tone={marketError ? "rose" : "cyan"} />
            <StatusCard title="Latest Decision" value={latestSignal?.decision || "NO SIGNAL"} tone={latestSignal?.decision === "BUY" ? "emerald" : latestSignal?.decision === "SELL" ? "rose" : "yellow"} />
            <StatusCard title="Risk Per Trade" value={`${riskSettings.riskPercentage}% max 2% enforced`} tone="emerald" />
            <StatusCard title="Execution Mode" value={executionModeLabel} tone={executionModeTone} />
          </section>
          {renderMarketPanel()}
          <SignalCard signal={latestSignal} />
        </>
      );
    }

    if (activeSection === "risk") {
      return (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <RiskSettings
            value={riskSettings}
            onChange={setRiskSettings}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
          <SignalCard signal={latestSignal} />
        </div>
      );
    }

    if (activeSection === "mt4") return <Mt4BridgePanel />;
    if (activeSection === "settings") return <SettingsPanel />;
    if (activeSection === "fundamentals") return <FundamentalsPanel />;
    if (activeSection === "prompt") return <PromptTrainer />;
    if (activeSection === "history") {
      return loadingSignals ? (
        <div className="terminal-panel grid min-h-40 place-items-center p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <LoadingSpinner />
            Loading signal history
          </div>
        </div>
      ) : (
        <SignalHistory signals={signals} />
      );
    }

    return null;
  }

  function handleLogout() {
    localStorage.removeItem("aldricAuthenticated");
    onLogout?.();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <Header compact />

          <nav className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-col lg:overflow-visible">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`inline-flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition lg:w-full ${
                    active
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-cyan-300/60 hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden space-y-3 p-4 lg:block">
            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs leading-5 text-yellow-100">
              Aldric does not guarantee profit. All trading involves risk.
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ShieldCheck size={15} className="text-cyan-300" />
                Execution gated
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">MT4 full-auto requires admin, account, EA, and risk gates.</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-300 hover:border-rose-300/60 hover:text-rose-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/65 p-4 xl:flex-row xl:items-center">
            <div>
              <p className="metric-label">Aldric Terminal</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">{activeTitle}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <AlertCircle size={17} className={marketError ? "text-rose-300" : "text-cyan-300"} />
                <span>{marketError ? "Realtime feed requires Binance connectivity." : "Terminal online. Awaiting risk-managed decisions."}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-rose-300 lg:hidden"
              >
                <LogOut size={17} />
                Logout
              </button>
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

          {renderSection()}
        </div>
      </main>
    </div>
  );
}

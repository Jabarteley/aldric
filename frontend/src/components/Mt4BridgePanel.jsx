import { Cable, CheckCircle2, Power, RefreshCcw, Shield, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmMt4Order, fetchMt4State, generateMt4Signal, updateMt4ExecutionMode } from "../services/api.js";
import LoadingSpinner from "./LoadingSpinner.jsx";
import Mt4ScanMonitor from "./Mt4ScanMonitor.jsx";
import Mt4TradeDetails from "./Mt4TradeDetails.jsx";

const symbols = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "BTCUSD", "BTCUSDT"];
const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

function money(value) {
  if (value === undefined || value === null) return "N/A";
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

export default function Mt4BridgePanel() {
  const [accountId, setAccountId] = useState("default");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [state, setState] = useState(null);
  const [signalResult, setSignalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadState({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      setState(await fetchMt4State(accountId));
    } catch (error) {
      if (!silent) setMessage(error.response?.data?.message || "Unable to load MT4 bridge state.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function requestSignal() {
    setLoading(true);
    setMessage("");
    try {
      const result = await generateMt4Signal({ accountId, symbol, timeframe });
      setSignalResult(result);
      await loadState();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to generate MT4 signal.");
    } finally {
      setLoading(false);
    }
  }

  async function approveOrder(orderId) {
    setLoading(true);
    setMessage("");
    try {
      await confirmMt4Order(orderId);
      setMessage("Order confirmed for EA polling if execution gates allow it.");
      await loadState();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to confirm order.");
    } finally {
      setLoading(false);
    }
  }

  async function setExecutionMode(nextAuto) {
    setLoading(true);
    setMessage("");
    try {
      const result = await updateMt4ExecutionMode({
        accountId,
        fullAutoEnabled: nextAuto,
        killSwitch: account?.killSwitch === true
      });
      setState((current) => ({ ...(current || {}), account: result.account }));
      setMessage(nextAuto ? "Automatic mode requested. Backend and EA gates must also be enabled." : "Manual confirmation mode enabled.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update execution mode.");
    } finally {
      setLoading(false);
    }
  }

  async function setKillSwitch(nextKillSwitch) {
    setLoading(true);
    setMessage("");
    try {
      const result = await updateMt4ExecutionMode({
        accountId,
        fullAutoEnabled: account?.fullAutoEnabled === true,
        killSwitch: nextKillSwitch
      });
      setState((current) => ({ ...(current || {}), account: result.account }));
      setMessage(nextKillSwitch ? "Kill switch enabled. Execution is blocked." : "Kill switch disabled. Execution gates still apply.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update kill switch.");
    } finally {
      setLoading(false);
    }
  }

  const account = state?.account;
  const marketCount = state?.marketData?.length || 0;
  const orders = state?.orders || [];
  const executionSettings = state?.executionSettings;
  const executionLabel = account
    ? account.fullAutoEnabled
      ? "Automatic requested"
      : "Manual / gated"
    : "No account loaded";

  useEffect(() => {
    loadState();
    const timer = window.setInterval(() => {
      loadState({ silent: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [accountId]);

  return (
    <section className="terminal-panel p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400/10 text-emerald-200">
            <Cable size={20} />
          </div>
          <div>
            <p className="metric-label">MT4 Bridge</p>
            <h2 className="text-lg font-semibold text-white">Broker feed, account state, and execution queue</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              The EA posts live MT4 data here. Full-auto execution is gated by admin settings, account state, local EA settings, and kill switch.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadState}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoadingSpinner /> : <RefreshCcw size={16} />}
            Refresh State
          </button>
          <button
            onClick={requestSignal}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoadingSpinner /> : <Wand2 size={16} />}
            MT4 Signal
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="metric-label">Account ID</span>
          <input value={accountId} onChange={(event) => setAccountId(event.target.value)} className="control-input mt-2 w-full" />
        </label>
        <label className="block">
          <span className="metric-label">Symbol</span>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="control-input mt-2 w-full">
            {symbols.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="metric-label">Timeframe</span>
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="control-input mt-2 w-full">
            {timeframes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <p className="metric-label">Balance / Equity</p>
          <p className="mt-1 text-sm font-semibold text-white">{money(account?.balance)} / {money(account?.equity)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <p className="metric-label">Daily P&L</p>
          <p className={`mt-1 text-sm font-semibold ${Number(account?.dailyPnl || 0) >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{money(account?.dailyPnl)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <p className="metric-label">Market Feeds</p>
          <p className="mt-1 text-sm font-semibold text-cyan-100">{marketCount} symbols</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <p className="metric-label">Execution</p>
          <p className="mt-1 text-sm font-semibold text-yellow-100">{executionLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Global: {executionSettings?.globalAutoEnabled ? "Automatic" : "Manual"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="metric-label">Execution Mode</p>
              <h3 className="text-base font-semibold text-white">
                {account ? (account.fullAutoEnabled ? "Automatic requested" : "Manual confirmation") : "No MT4 account loaded"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Automatic execution still requires admin global automatic mode, EA auto enabled, no kill switch, and a valid risk-approved signal.
              </p>
            </div>
            <button
              onClick={() => setExecutionMode(!(account?.fullAutoEnabled === true))}
              disabled={loading || !account}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                account?.fullAutoEnabled
                  ? "border border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
                  : "bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              }`}
            >
              <Power size={16} />
              {account?.fullAutoEnabled ? "Switch to Manual" : "Switch to Automatic"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="metric-label">Kill Switch</p>
              <h3 className={`text-base font-semibold ${account?.killSwitch ? "text-rose-200" : "text-white"}`}>
                {account?.killSwitch ? "Execution blocked" : "Execution gate open"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Use this to stop all EA execution immediately for the selected account.</p>
            </div>
            <button
              onClick={() => setKillSwitch(!(account?.killSwitch === true))}
              disabled={loading || !account}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                account?.killSwitch
                  ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  : "border border-rose-400/30 bg-rose-400/10 text-rose-100"
              }`}
            >
              <Shield size={16} />
              {account?.killSwitch ? "Disable Kill Switch" : "Enable Kill Switch"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Mt4ScanMonitor state={state} />
      </div>

      {signalResult?.signal && (
        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <Mt4TradeDetails result={signalResult} />
        </div>
      )}

      {!!orders.length && (
        <div className="mt-5 space-y-2">
          <p className="metric-label">Recent MT4 Orders</p>
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 md:flex-row md:items-center">
              <div>
                <p className="font-semibold text-white">{order.symbol} {order.direction} {order.lotSize} lots</p>
                <p className="text-xs text-slate-500">SL {order.stopLoss} / TP {order.takeProfit} / {order.status}</p>
              </div>
              {order.status === "PENDING_CONFIRMATION" && (
                <button
                  onClick={() => approveOrder(order.id)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  Confirm
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">{message}</div>}
    </section>
  );
}

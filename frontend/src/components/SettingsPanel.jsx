import { AlertTriangle, Bot, CheckCircle2, Power, RefreshCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMt4State, scanMt4Signals, updateMt4ExecutionMode, updateMt4GlobalExecutionSettings } from "../services/api.js";
import LoadingSpinner from "./LoadingSpinner.jsx";
import Mt4TradeDetails from "./Mt4TradeDetails.jsx";

const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

function Gate({ label, enabled }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-xs font-semibold ${enabled ? "text-emerald-200" : "text-yellow-100"}`}>
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export default function SettingsPanel() {
  const [accountId, setAccountId] = useState("default");
  const [timeframe, setTimeframe] = useState("M15");
  const [state, setState] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const account = state?.account;
  const executionSettings = state?.executionSettings;

  async function loadState() {
    setLoading(true);
    setMessage("");
    try {
      setState(await fetchMt4State(accountId));
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load account settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMode(nextAuto, nextKillSwitch = account?.killSwitch === true) {
    setLoading(true);
    setMessage("");
    try {
      const result = await updateMt4ExecutionMode({ accountId, fullAutoEnabled: nextAuto, killSwitch: nextKillSwitch });
      setState((current) => ({ ...(current || {}), account: result.account }));
      setMessage("Execution settings updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update execution settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveGlobalSettings(nextAuto, nextKillSwitch = executionSettings?.globalKillSwitch === true) {
    setLoading(true);
    setMessage("");
    try {
      const result = await updateMt4GlobalExecutionSettings({
        globalAutoEnabled: nextAuto,
        globalKillSwitch: nextKillSwitch
      });
      setState((current) => ({ ...(current || {}), executionSettings: result.executionSettings }));
      setMessage("Admin execution settings updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update admin execution settings.");
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setLoading(true);
    setMessage("");
    try {
      const result = await scanMt4Signals({ accountId, timeframe });
      setScanResult(result);
      setMessage(`Scan complete. Selected ${result.selectedSymbol}. Decision: ${result.signal?.decision}.`);
      await loadState();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to scan MT4 signals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  return (
    <section className="space-y-5">
      <div className="terminal-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
              <Bot size={20} />
            </div>
            <div>
              <p className="metric-label">Execution Settings</p>
              <h2 className="text-lg font-semibold text-white">Manual or automatic MT4 trading</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                Automatic mode lets the EA keep scanning live broker feeds and execute approved orders while you are away. It requires admin automatic mode, account automatic mode, EA local auto, no kill switch, and a valid risk-checked signal.
              </p>
            </div>
          </div>
          <button
            onClick={loadState}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-300 disabled:opacity-60"
          >
            {loading ? <LoadingSpinner /> : <RefreshCcw size={16} />}
            Load Account
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label>
            <span className="metric-label">MT4 Account ID</span>
            <input value={accountId} onChange={(event) => setAccountId(event.target.value)} className="control-input mt-2 w-full" />
          </label>
          <label>
            <span className="metric-label">Scan Timeframe</span>
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="control-input mt-2 w-full">
              {timeframes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="terminal-panel p-5 xl:col-span-2">
          <p className="metric-label">Admin Global Control</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{executionSettings?.globalAutoEnabled ? "Global automatic enabled" : "Global manual/gated"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This is the admin master switch. Automatic trading cannot happen unless this is enabled from the dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => saveGlobalSettings(false)}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${!executionSettings?.globalAutoEnabled ? "bg-cyan-300 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-100"}`}
            >
              <CheckCircle2 size={16} />
              Global Manual
            </button>
            <button
              onClick={() => saveGlobalSettings(true)}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${executionSettings?.globalAutoEnabled ? "bg-emerald-300 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-100"}`}
            >
              <Power size={16} />
              Global Automatic
            </button>
            <button
              onClick={() => saveGlobalSettings(executionSettings?.globalAutoEnabled === true, !(executionSettings?.globalKillSwitch === true))}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${executionSettings?.globalKillSwitch ? "bg-cyan-300 text-slate-950" : "border border-rose-400/30 bg-rose-400/10 text-rose-100"}`}
            >
              <ShieldAlert size={16} />
              {executionSettings?.globalKillSwitch ? "Disable Global Kill Switch" : "Enable Global Kill Switch"}
            </button>
          </div>
        </div>

        <div className="terminal-panel p-5">
          <p className="metric-label">Mode Toggle</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{account?.fullAutoEnabled ? "Automatic requested" : "Manual confirmation"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manual mode creates pending orders for confirmation. Automatic mode allows approved orders to become EA-ready only when every gate is open.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => saveMode(false)}
              disabled={loading || !account}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${!account?.fullAutoEnabled ? "bg-cyan-300 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-100"}`}
            >
              <CheckCircle2 size={16} />
              Manual
            </button>
            <button
              onClick={() => saveMode(true)}
              disabled={loading || !account}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${account?.fullAutoEnabled ? "bg-emerald-300 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-100"}`}
            >
              <Power size={16} />
              Automatic
            </button>
          </div>
        </div>

        <div className="terminal-panel p-5">
          <p className="metric-label">Kill Switch</p>
          <h3 className={`mt-1 text-xl font-semibold ${account?.killSwitch ? "text-rose-200" : "text-white"}`}>
            {account?.killSwitch ? "Execution blocked" : "Execution allowed by account"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Use this to immediately block execution for this account, even if automatic mode is enabled.</p>
          <button
            onClick={() => saveMode(account?.fullAutoEnabled === true, !(account?.killSwitch === true))}
            disabled={loading || !account}
            className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${account?.killSwitch ? "bg-cyan-300 text-slate-950" : "border border-rose-400/30 bg-rose-400/10 text-rose-100"}`}
          >
            <ShieldAlert size={16} />
            {account?.killSwitch ? "Disable Kill Switch" : "Enable Kill Switch"}
          </button>
        </div>
      </div>

      <div className="terminal-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="metric-label">Automation Gates</p>
            <h3 className="text-lg font-semibold text-white">Everything must be ON before unattended execution can happen</h3>
          </div>
          <button
            onClick={runScan}
            disabled={loading || !account}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:opacity-60"
          >
            {loading ? <LoadingSpinner /> : <Bot size={16} />}
            Scan Now
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Gate label="Account automatic" enabled={account?.fullAutoEnabled === true} />
          <Gate label="EA local automatic" enabled={account?.eaAutoEnabled === true} />
          <Gate label="Account kill switch off" enabled={account && account.killSwitch !== true} />
          <Gate label="Admin global automatic" enabled={executionSettings?.globalAutoEnabled === true || scanResult?.executionMode?.globalAutoEnabled === true} />
          <Gate label="Global kill switch off" enabled={executionSettings ? executionSettings.globalKillSwitch !== true : scanResult?.executionMode?.globalKillSwitch !== true} />
        </div>
        <div className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm leading-6 text-yellow-100">
          <div className="flex gap-2">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>For unattended trading, MT4 must stay open on a VPS or always-on computer, the EA must remain attached, and AutoTrading must be enabled in MT4.</span>
          </div>
        </div>
      </div>

      {scanResult?.signal && (
        <div className="terminal-panel p-5">
          <Mt4TradeDetails result={scanResult} />
        </div>
      )}

      {message && <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">{message}</div>}
    </section>
  );
}

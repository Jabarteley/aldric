import { Activity, AlertTriangle, CheckCircle2, Clock3, Radar, XCircle } from "lucide-react";

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Never";
  return date.toLocaleString();
}

function age(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "No data";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function numberValue(value, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toLocaleString(undefined, { maximumFractionDigits: digits });
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

export default function Mt4ScanMonitor({ state }) {
  const account = state?.account;
  const feeds = state?.marketData || [];
  const scans = state?.scans || [];
  const executionSettings = state?.executionSettings || {};
  const lastScan = scans[0];
  const latestFeed = feeds[0];
  const globalAuto = executionSettings.globalAutoEnabled === true;
  const accountAuto = account?.fullAutoEnabled === true;
  const eaAuto = account?.eaAutoEnabled === true;
  const killSwitchOff = executionSettings.globalKillSwitch !== true && account?.killSwitch !== true;
  const ready = globalAuto && accountAuto && eaAuto && killSwitchOff;

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="metric-label">MT4 Full Scan Monitor</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {ready ? "Automatic execution gates are open" : "Automatic execution is gated"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Last scan: {lastScan ? `${age(lastScan.createdAt)} / ${lastScan.status}` : "No scan recorded yet"}.
            Last EA feed: {latestFeed ? `${age(latestFeed.updatedAt)} / ${latestFeed.symbol} ${latestFeed.timeframe}` : "No market feed yet"}.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${ready ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-yellow-400/30 bg-yellow-400/10 text-yellow-100"}`}>
          {ready ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {ready ? "Ready" : "Gated"}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Gate label="Global automatic" enabled={globalAuto} />
        <Gate label="Account automatic" enabled={accountAuto} />
        <Gate label="EA local automatic" enabled={eaAuto} />
        <Gate label="Kill switches off" enabled={killSwitchOff} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity size={16} />
            Heartbeat
          </div>
          <p className="mt-2 text-sm text-slate-300">Account: {age(account?.updatedAt)}</p>
          <p className="mt-1 text-sm text-slate-300">Feed: {age(latestFeed?.updatedAt)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar size={16} />
            Last Selection
          </div>
          <p className="mt-2 text-sm text-slate-300">{lastScan?.selectedSymbol || "None"} / {lastScan?.decision || "N/A"}</p>
          <p className="mt-1 text-sm text-slate-300">Scanned: {lastScan?.scanned || 0} feeds</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock3 size={16} />
            Last Error
          </div>
          <p className="mt-2 text-sm text-slate-300">{lastScan?.status === "ERROR" ? lastScan.error : "No latest scan error"}</p>
          <p className="mt-1 text-xs text-slate-500">{formatTime(lastScan?.createdAt)}</p>
        </div>
      </div>

      {!!lastScan?.scanSummary?.length && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-900/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Blocked</th>
                <th className="px-3 py-2">Conf.</th>
                <th className="px-3 py-2">Entry</th>
                <th className="px-3 py-2">SL</th>
                <th className="px-3 py-2">TP</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {lastScan.scanSummary.map((item) => (
                <tr key={`${item.symbol}-${item.timeframe}`}>
                  <td className="px-3 py-2 font-semibold text-white">{item.symbol}</td>
                  <td className="px-3 py-2">{item.decisionHint}</td>
                  <td className={item.blocked ? "px-3 py-2 text-yellow-100" : "px-3 py-2 text-emerald-200"}>{String(item.blocked)}</td>
                  <td className="px-3 py-2">{item.confluenceCount}</td>
                  <td className="px-3 py-2">{numberValue(item.entryPrice, 6)}</td>
                  <td className="px-3 py-2">{numberValue(item.stopLoss, 6)}</td>
                  <td className="px-3 py-2">{numberValue(item.takeProfit, 6)}</td>
                  <td className="px-3 py-2">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!scans.length && (
        <div>
          <p className="metric-label">Recent MT4 Scan History</p>
          <div className="mt-2 space-y-2">
            {scans.slice(0, 6).map((scan) => (
              <div key={scan.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/55 p-3 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-white">{scan.selectedSymbol || "No selection"} / {scan.decision || scan.status}</p>
                  <p className="text-xs text-slate-500">{formatTime(scan.createdAt)} / scanned {scan.scanned || 0}</p>
                </div>
                <p className="max-w-3xl text-sm text-slate-300">{scan.error || scan.reason || "Scan completed."}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { Activity, Radio, ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/75 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <Activity size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Aldric AI Trading Assistant</h1>
              <p className="text-sm text-slate-400">Real-time BTC/USDT intelligence, risk controls, and signal history</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              <Radio size={17} />
              <span>Realtime only</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
              <ShieldCheck size={17} />
              <span>No live execution</span>
            </div>
          </div>
        </div>
        <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          Aldric does not guarantee profit. All trading involves risk. Signals are for real-time analysis only.
          Use proper risk management before making any trading decision.
        </p>
      </div>
    </header>
  );
}

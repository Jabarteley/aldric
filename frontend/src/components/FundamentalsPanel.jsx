import { CalendarClock, Plus, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { addFundamentalEvent, fetchFundamentalEvents, syncFundamentalEvents } from "../services/api.js";
import LoadingSpinner from "./LoadingSpinner.jsx";

const defaultForm = {
  title: "",
  country: "United States",
  currency: "USD",
  impact: "HIGH",
  time: ""
};

export default function FundamentalsPanel() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEvents({ preserveMessage = false } = {}) {
    setLoading(true);
    if (!preserveMessage) setMessage("");
    try {
      const data = await fetchFundamentalEvents();
      setEvents(data.events || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load fundamental events.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEvent(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await addFundamentalEvent({
        ...form,
        time: new Date(form.time).toISOString(),
        currencies: [form.currency]
      });
      setForm(defaultForm);
      await loadEvents({ preserveMessage: true });
      setMessage("Fundamental event added. High-impact matching events will block trades near release time.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add event.");
    } finally {
      setLoading(false);
    }
  }

  async function syncProvider() {
    setLoading(true);
    setMessage("");
    try {
      const data = await syncFundamentalEvents();
      await loadEvents({ preserveMessage: true });
      setMessage(`Synced ${data.count} provider events.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to sync provider. Add an FMP, Finnhub, or Trading Economics key, or use manual events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <section className="space-y-5">
      <div className="terminal-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-400/10 text-yellow-200">
              <CalendarClock size={20} />
            </div>
            <div>
              <p className="metric-label">Fundamentals & News</p>
              <h2 className="text-lg font-semibold text-white">Economic events used by Aldric&apos;s trade filter</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                High-impact events matching a symbol&apos;s currency block trades 30 minutes before and after release. FMP is the default provider; Finnhub and Trading Economics are optional.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadEvents} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60">
              {loading ? <LoadingSpinner /> : <RefreshCcw size={16} />}
              Refresh
            </button>
            <button onClick={syncProvider} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-yellow-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              Sync Provider
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={saveEvent} className="terminal-panel p-5">
        <p className="metric-label">Add Manual Event</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2">
            <span className="metric-label">Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="control-input mt-2 w-full" placeholder="US CPI / FOMC / NFP" required />
          </label>
          <label>
            <span className="metric-label">Currency</span>
            <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="control-input mt-2 w-full" required />
          </label>
          <label>
            <span className="metric-label">Impact</span>
            <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} className="control-input mt-2 w-full">
              <option>HIGH</option>
              <option>MEDIUM</option>
              <option>LOW</option>
            </select>
          </label>
          <label>
            <span className="metric-label">Time</span>
            <input type="datetime-local" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="control-input mt-2 w-full" required />
          </label>
        </div>
        <button type="submit" disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-3 py-2 text-sm font-semibold text-yellow-100 disabled:opacity-60">
          <Plus size={16} />
          Add Event
        </button>
      </form>

      <div className="terminal-panel overflow-hidden">
        <div className="border-b border-slate-800 p-5">
          <p className="metric-label">Upcoming Events</p>
          <h3 className="text-lg font-semibold text-white">Trade-blocking calendar</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {events.map((event) => (
            <div key={event.id} className="grid gap-2 p-4 md:grid-cols-[1fr_120px_120px_180px] md:items-center">
              <div>
                <p className="font-semibold text-white">{event.title}</p>
                <p className="text-xs text-slate-500">{event.country || event.source} / {(event.currencies || []).join(", ")}</p>
              </div>
              <span className="rounded bg-yellow-400/10 px-2 py-1 text-xs font-semibold text-yellow-100">{event.impact}</span>
              <span className="text-sm text-slate-300">{event.source}</span>
              <span className="text-sm text-slate-400">{new Date(event.time).toLocaleString()}</span>
            </div>
          ))}
          {!events.length && <div className="p-8 text-center text-sm text-slate-400">No fundamental events loaded.</div>}
        </div>
      </div>

      {message && <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">{message}</div>}
    </section>
  );
}

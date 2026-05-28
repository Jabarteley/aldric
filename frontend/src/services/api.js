import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 20000
});

const mt4Headers = import.meta.env.VITE_MT4_BRIDGE_SECRET
  ? { "x-aldric-mt4-secret": import.meta.env.VITE_MT4_BRIDGE_SECRET }
  : {};

export async function fetchMarket(interval = "15m") {
  const { data } = await api.get("/market/btc", { params: { interval } });
  return data;
}

export async function fetchSignals() {
  const { data } = await api.get("/signals");
  return data;
}

export async function generateSignal(payload) {
  const { data } = await api.post("/analysis/generate", payload);
  return data;
}

export async function fetchPromptSettings() {
  const { data } = await api.get("/settings/prompt");
  return data;
}

export async function savePromptSettings(prompt) {
  const { data } = await api.put("/settings/prompt", { prompt });
  return data;
}

export async function resetPromptSettings() {
  const { data } = await api.post("/settings/prompt/reset");
  return data;
}

export async function addPromptTrainingNote(note) {
  const { data } = await api.post("/settings/prompt/training-note", { note });
  return data;
}

export async function fetchMt4State(accountId = "default") {
  const { data } = await api.get("/mt4/state", { params: { accountId }, headers: mt4Headers });
  return data;
}

export async function generateMt4Signal({ accountId = "default", symbol = "XAUUSD", timeframe = "M15" }) {
  const { data } = await api.get("/mt4/signal", { params: { accountId, symbol, timeframe }, headers: mt4Headers });
  return data;
}

export async function confirmMt4Order(orderId) {
  const { data } = await api.post(`/mt4/orders/${orderId}/confirm`, {}, { headers: mt4Headers });
  return data;
}

export async function updateMt4ExecutionMode({ accountId = "default", fullAutoEnabled = false, killSwitch = false }) {
  const { data } = await api.post(
    "/mt4/execution-mode",
    { accountId, fullAutoEnabled, killSwitch },
    { headers: mt4Headers }
  );
  return data;
}

export async function updateMt4GlobalExecutionSettings({ globalAutoEnabled = false, globalKillSwitch = false }) {
  const { data } = await api.post(
    "/mt4/global-execution-settings",
    { globalAutoEnabled, globalKillSwitch },
    { headers: mt4Headers }
  );
  return data;
}

export async function scanMt4Signals({ accountId = "default", timeframe = "M15" }) {
  const { data } = await api.post("/mt4/scan", { accountId, timeframe }, { headers: mt4Headers });
  return data;
}

export async function fetchFundamentalEvents() {
  const now = Date.now();
  const from = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await api.get("/fundamentals/events", { params: { from, to, limit: 200 } });
  return data;
}

export async function addFundamentalEvent(payload) {
  const { data } = await api.post("/fundamentals/events", payload);
  return data;
}

export async function syncFundamentalEvents() {
  const { data } = await api.post("/fundamentals/sync", {});
  return data;
}

export default api;

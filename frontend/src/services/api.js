import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 20000
});

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

export default api;

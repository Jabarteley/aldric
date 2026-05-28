import axios from "axios";
import dns from "node:dns/promises";
import tls from "node:tls";

const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || "https://data-api.binance.vision/api/v3";

const binanceClient = axios.create({
  baseURL: BINANCE_BASE_URL,
  timeout: Number(process.env.BINANCE_TIMEOUT_MS) || 20000,
  proxy: false,
  headers: {
    Accept: "application/json",
    "User-Agent": "AldricTradingAssistant/1.0"
  }
});

function normalizeBinanceError(error) {
  const message = error.response?.data?.msg || error.message || "Unable to fetch real-time Binance market data.";
  const nextError = new Error(`Real-time Binance API request failed: ${message}`);
  nextError.status = 502;
  return nextError;
}

export async function getTicker24h(symbol = "BTCUSDT") {
  let data;
  try {
    const response = await binanceClient.get("/ticker/24hr", {
      params: { symbol }
    });
    data = response.data;
  } catch (error) {
    throw normalizeBinanceError(error);
  }

  return {
    symbol: data.symbol,
    currentPrice: Number(data.lastPrice),
    priceChangePercent: Number(data.priceChangePercent),
    high24h: Number(data.highPrice),
    low24h: Number(data.lowPrice),
    volume24h: Number(data.volume),
    quoteVolume24h: Number(data.quoteVolume)
  };
}

export async function getCandles(symbol = "BTCUSDT", interval = "15m", limit = 220) {
  let data;
  try {
    const response = await binanceClient.get("/klines", {
      params: { symbol, interval, limit }
    });
    data = response.data;
  } catch (error) {
    throw normalizeBinanceError(error);
  }

  return data.map((item) => ({
    openTime: item[0],
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5]),
    closeTime: item[6]
  }));
}

export async function getBtcMarket(interval = "15m") {
  const [ticker, candles] = await Promise.all([getTicker24h("BTCUSDT"), getCandles("BTCUSDT", interval, 220)]);
  return { ticker, candles, interval };
}

function testTls(hostname, port = 443, timeout = 10000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = tls.connect({ host: hostname, port, servername: hostname, timeout }, () => {
      resolve({
        ok: true,
        latencyMs: Date.now() - startedAt,
        protocol: socket.getProtocol(),
        authorized: socket.authorized
      });
      socket.end();
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: `TLS connection timed out after ${timeout}ms` });
    });

    socket.on("error", (error) => {
      resolve({ ok: false, error: error.message, code: error.code });
    });
  });
}

export async function diagnoseBinanceConnection() {
  const url = new URL(BINANCE_BASE_URL);
  const hostname = url.hostname;
  const startedAt = Date.now();
  const result = {
    hostname,
    endpoint: `${BINANCE_BASE_URL}/time`,
    proxyEnvDetected: Boolean(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY),
    proxyEnv: {
      HTTP_PROXY: process.env.HTTP_PROXY ? "set" : "not_set",
      HTTPS_PROXY: process.env.HTTPS_PROXY ? "set" : "not_set",
      ALL_PROXY: process.env.ALL_PROXY ? "set" : "not_set",
      NO_PROXY: process.env.NO_PROXY || ""
    }
  };

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    result.dns = { ok: true, addresses };
  } catch (error) {
    result.dns = { ok: false, error: error.message, code: error.code };
  }

  result.tls = await testTls(hostname);

  try {
    const response = await binanceClient.get("/time");
    result.http = {
      ok: true,
      status: response.status,
      data: response.data,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    result.http = {
      ok: false,
      error: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    };
  }

  result.ok = Boolean(result.http?.ok);
  return result;
}

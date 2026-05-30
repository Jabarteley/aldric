function round(value, decimals = 6) {
  return Number(value.toFixed(decimals));
}

export function calculateEMA(values, period) {
  if (!values.length) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / Math.min(period, values.length);

  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
  }

  return round(ema);
}

export function calculateRSI(values, period = 14) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - 100 / (1 + rs), 2);
}

export function calculateMACD(values, fast = 12, slow = 26, signalPeriod = 9) {
  if (values.length < slow + signalPeriod) {
    return { macd: null, signal: null, histogram: null };
  }

  const macdSeries = [];
  for (let i = slow; i <= values.length; i += 1) {
    const slice = values.slice(0, i);
    macdSeries.push(calculateEMA(slice, fast) - calculateEMA(slice, slow));
  }

  const macd = macdSeries[macdSeries.length - 1];
  const signal = calculateEMA(macdSeries, signalPeriod);
  return {
    macd: round(macd),
    signal,
    histogram: round(macd - signal)
  };
}

export function calculateATR(candles, period = 14) {
  if (candles.length <= period) return null;

  const trueRanges = [];
  for (let i = 1; i < candles.length; i += 1) {
    const high = candles[i].high;
    const low = candles[i].low;
    const previousClose = candles[i - 1].close;
    trueRanges.push(Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose)));
  }

  const recent = trueRanges.slice(-period);
  const atr = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  return round(atr);
}

export function supportResistance(candles, lookback = 40) {
  const recent = candles.slice(-lookback);
  const support = Math.min(...recent.map((candle) => candle.low));
  const resistance = Math.max(...recent.map((candle) => candle.high));
  return {
    support: round(support),
    resistance: round(resistance)
  };
}

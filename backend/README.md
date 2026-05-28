# Aldric Backend

Express API for Aldric AI Trading Assistant. This version uses Firebase Firestore for signal history, real-time Binance public market data, and OpenAI for structured market reasoning.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## Environment

Set these values in `.env`:

- `PORT`: API port, default `5000`
- `OPENAI_API_KEY`: OpenAI API key. Required for signal generation.
- `OPENAI_MODEL`: default `gpt-4o-mini`
- `CLIENT_URL`: frontend origin, default `http://localhost:5173`
- `BINANCE_BASE_URL`: realtime Binance market-data base URL, default `https://data-api.binance.vision/api/v3`
- Firebase credentials using either:
  - `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`
  - or inline `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

## Firebase

Create a Firebase project, enable Firestore, then create a service account key from Firebase project settings. Keep the key out of source control.

## API

- `GET /api/health`
- `GET /api/market/btc?interval=15m`
- `GET /api/market/candles?symbol=BTCUSDT&interval=15m&limit=100`
- `GET /api/market/diagnostics`
- `POST /api/analysis/generate`
- `GET /api/signals`
- `GET /api/signals/:id`
- `DELETE /api/signals/:id`

Example signal request:

```bash
curl -X POST http://localhost:5000/api/analysis/generate \
  -H "Content-Type: application/json" \
  -d "{\"accountBalance\":200,\"riskPercentage\":1,\"dailyTarget\":20,\"maxDailyLossPercentage\":5,\"timeframe\":\"15m\"}"
```

## Future MT4 Integration

The next phase can add an MQL4 Expert Advisor, backend signal endpoint for MT4, demo account testing, order execution with stop loss and take profit, trade result logging, and live trading only after extended testing. This version does not place trades.

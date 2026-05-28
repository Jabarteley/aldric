# Aldric AI Trading Assistant

Aldric is a web-based, risk-first trading signal dashboard. This first version analyzes BTC/USDT using real-time Binance public market data, calculates technical indicators, asks OpenAI for structured reasoning, validates the result with strict risk rules, and stores signal history in Firebase Firestore.

This version does not place live trades automatically.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios, Recharts
- Backend: Node.js, Express, Firebase Admin SDK, OpenAI API, Binance public API
- Database: Firebase Firestore

## Run Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Configure `.env` with Firebase credentials and `OPENAI_API_KEY`. For the economic calendar, FMP is the default cheaper/free provider:

```env
ECONOMIC_CALENDAR_PROVIDER=fmp
FMP_API_KEY=
FINNHUB_API_KEY=
TRADING_ECONOMICS_CLIENT=
TRADING_ECONOMICS_SECRET=
```

Trading Economics is optional, not required. Finnhub can be selected with `ECONOMIC_CALENDAR_PROVIDER=finnhub`. If no economic calendar API key is configured, Aldric still works but marks the calendar unavailable and skips the news-risk filter instead of pretending news was checked.

## Run Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Backend Folders

- `config`: Firebase initialization
- `controllers`: HTTP request handlers
- `models`: Firestore signal persistence
- `routes`: Express route definitions
- `services`: Binance, technical analysis, risk management, OpenAI
- `utils`: indicator math and signal validation

## Frontend Folders

- `components`: dashboard UI sections
- `pages`: main dashboard page
- `services`: API client

## API Quick Test

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/market/btc
curl -X POST http://localhost:5000/api/analysis/generate -H "Content-Type: application/json" -d "{\"accountBalance\":200,\"riskPercentage\":1,\"timeframe\":\"15m\"}"
```

## Completed Features

- Binance BTC/USDT market data
- EMA 20/50/200, RSI 14, MACD, ATR, support/resistance
- Trend, volatility, and market condition classification
- Risk plan with max 2% per trade, ATR stop, 2:1 preferred target
- AI JSON-only signal generation through OpenAI
- Backend validation that forces unsafe setups to `NO_TRADE`
- Firestore signal history
- Responsive dark trading dashboard
- MT4 bridge endpoints for market data, account state, signals, orders, and trade result logging
- MQL4 Expert Advisor bridge template in `mt4/AldricBridgeEA.mq4`
- Fundamentals/news calendar storage, manual event entry, FMP/Finnhub/Trading Economics provider sync, and trade blocking around high-impact events

## Future MT4 Integration

Phase 2 now includes a deployable MT4 bridge foundation. Full-auto execution is disabled by default and gated by admin dashboard settings, EA input settings, account state, kill switch, and risk validation. See `backend/docs/MT4_BRIDGE.md`.

For a plain-English client installation guide, see `docs/CLIENT_MT4_SETUP_GUIDE.md`.

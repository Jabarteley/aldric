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

Configure `.env` with Firebase credentials and `OPENAI_API_KEY`.

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

## Future MT4 Integration

Phase 2 can add an MQL4 Expert Advisor, backend signal endpoint for MT4, demo account testing, order execution with stop loss and take profit, trade result logging, and live trading only after testing. MT4 execution is intentionally not included in this version.

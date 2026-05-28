# Aldric MT4 Bridge

This bridge lets MetaTrader 4 send live broker data to Aldric and receive risk-checked signals. Full-auto order execution is disabled by default and controlled from the admin dashboard.

## Backend Endpoints

- `POST /api/mt4/market-data`
- `POST /api/mt4/account`
- `POST /api/mt4/scan`
- `GET /api/mt4/signal?accountId=default&symbol=XAUUSD&timeframe=M15`
- `GET /api/mt4/state?accountId=default`
- `GET /api/mt4/orders/next?accountId=default`
- `POST /api/mt4/orders/:id/confirm`
- `POST /api/mt4/trade-result`

All endpoints accept `x-aldric-mt4-secret` when `MT4_BRIDGE_SECRET` is set.

## Execution Gates

Automatic execution requires all of these:

- Admin dashboard: `Settings > Global Automatic`
- Admin dashboard: global kill switch off
- Account setting: `Settings > Execution Mode > Automatic`
- Account kill switch off
- EA input `FullAutoLocalEnabled=true`
- MT4 terminal `AutoTrading=ON`
- signal is not `NO_TRADE`
- signal has SL, TP, and at least `2.5R`

No MT4 full-auto or kill-switch environment variables are used. These controls live in the dashboard.

## MT4 Setup

1. Copy `mt4/AldricBridgeEA.mq4` into MT4 `MQL4/Experts`.
2. Compile it in MetaEditor.
3. MT4: `Tools > Options > Expert Advisors`.
4. Enable `Allow WebRequest for listed URL`.
5. Add your backend URL, for local development: `http://127.0.0.1:5000`.
6. Attach the EA to a chart.
7. Set broker symbols in `SymbolsCsv`, for example `XAUUSD,EURUSD,GBPUSD,USDJPY,GBPJPY,BTCUSD`.

Use manual confirmation first. Full-auto execution should only be enabled after forward testing.

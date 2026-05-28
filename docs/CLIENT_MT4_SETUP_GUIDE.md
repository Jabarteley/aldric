# Aldric Client Setup Guide

This guide explains how a client connects their MT4 trading account to Aldric.

## What Aldric Does

Aldric connects to the client account through a small MT4 robot called an Expert Advisor, or EA.

The EA does four jobs:

1. Reads live broker prices from MT4.
2. Reads the account balance, equity, open trades, and daily profit/loss.
3. Sends that information to Aldric.
4. Receives approved trade orders from Aldric and places them on MT4 with stop loss and take profit.

There is no QR code for MT4. The client connects by installing the Aldric EA inside MetaTrader 4.

## What Is Implemented

- MT4 account connection through `AldricBridgeEA`.
- Live MT4 price feed for `XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `GBPJPY`, `BTCUSD`, and broker-specific symbols.
- Account state: balance, equity, daily P&L, drawdown, open-trade count.
- Broker symbol metadata: spread, digits, point size, tick value, min lot, max lot, lot step, stop level.
- Risk checks: stop loss required, take profit required, max 2% risk, minimum 2.5R, max daily loss, max trades per day, daily target stop.
- Automatic/manual execution mode.
- Kill switch.
- EA timer loop that keeps checking for signals.
- Backend scan endpoint that checks latest MT4 feeds and chooses the best valid setup.
- Fundamentals/news calendar through manual dashboard entry or provider sync.
- Trade blocking around high-impact news events.

Provider note:

- Manual news events work now in the dashboard.
- Automatic economic-calendar sync works after provider credentials are added to the backend.

Not guaranteed:

- $20 per day from a $200 account. That is the target, not a guarantee. Some days Aldric should take no trade.

## Simple Connection Flow

```text
Client logs into MT4 broker account
        |
        v
AldricBridgeEA runs inside MT4
        |
        v
EA sends live broker prices and account data to Aldric
        |
        v
Aldric scans the market
        |
        v
Aldric returns BUY, SELL, or NO_TRADE
        |
        v
If automatic mode is enabled, EA places approved trades
```

## What You Provide To The Client

Give the client:

- `AldricBridgeEA.mq4`
- your hosted backend URL
- the bridge secret
- symbol list to trade

Example:

```text
BackendBaseUrl = https://your-aldric-backend.up.railway.app
BridgeSecret = your_secret_here
SymbolsCsv = XAUUSD,EURUSD,GBPUSD,USDJPY,GBPJPY,BTCUSD
```

## Client Installation Steps

1. Open MetaTrader 4.
2. Log into the broker account.
3. Click `File > Open Data Folder`.
4. Open `MQL4`.
5. Open `Experts`.
6. Copy `AldricBridgeEA.mq4` into the `Experts` folder.
7. Open MetaEditor.
8. Find `AldricBridgeEA.mq4`.
9. Click `Compile`.
10. Restart MT4 or refresh the Navigator panel.
11. In MT4, go to `Tools > Options > Expert Advisors`.
12. Tick `Allow WebRequest for listed URL`.
13. Add your backend URL.
14. Click OK.
15. Drag `AldricBridgeEA` onto a chart.

## EA Settings

Set these inputs when attaching the EA:

```text
BackendBaseUrl = your backend URL
BridgeSecret = your bridge secret
AccountId = client account name or number
SymbolsCsv = XAUUSD,EURUSD,GBPUSD,USDJPY,GBPJPY,BTCUSD
SignalTimeframe = PERIOD_M15
FullAutoLocalEnabled = false or true
TimerSeconds = 300
RiskPercentage = 2
DailyTarget = 20
MaxDailyLoss = 10
MaxTradesToday = 3
```

`TimerSeconds = 300` means Aldric checks every 5 minutes.

## Manual Mode

Manual mode means:

- Aldric analyzes the market.
- Aldric creates signals.
- Orders wait for confirmation.
- The EA will not place trades automatically.

Use this first.

## Automatic Mode

Automatic mode means:

- The EA keeps sending live data.
- Aldric keeps scanning.
- If Aldric finds a valid trade, it creates an approved order.
- The EA can place that trade automatically.

Automatic trading only works when all gates are open:

1. Dashboard admin settings:

```text
Settings > Global Automatic
Settings > Global Kill Switch > Off
```

2. Dashboard account settings:

```text
Settings > Execution Mode > Automatic
Settings > Kill Switch > Off
```

3. EA input:

```text
FullAutoLocalEnabled = true
```

4. MT4:

```text
AutoTrading = ON
```

If any one of these is off, Aldric will not place trades automatically.

## 24/7 Running

For unattended trading, MT4 must stay open.

Best setup:

```text
Windows VPS
MT4 installed
Client broker account logged in
AldricBridgeEA attached
AutoTrading enabled
Backend hosted by you
Frontend hosted by you
```

If the client closes MT4 or turns off the computer, Aldric cannot place MT4 trades.

## Adding News Events

In the Aldric dashboard, open:

```text
Fundamentals
```

You can manually add events like:

```text
Title: US CPI
Currency: USD
Impact: HIGH
Time: release time
```

Aldric will avoid trades around high-impact events for matching symbols.

To sync an economic-calendar provider, configure the backend:

```env
TRADING_ECONOMICS_CLIENT=your_client
TRADING_ECONOMICS_SECRET=your_secret
```

Then click:

```text
Fundamentals > Sync Provider
```

## Risk Rules

Aldric is designed to protect the account first.

It will block trades when:

- stop loss is missing
- take profit is missing
- risk is above 2%
- reward-to-risk is below 2.5R
- daily loss limit is hit
- daily target is already hit
- max trades for the day is reached
- signal quality is too weak
- market is unclear
- kill switch is on
- a high-impact news event is within the restricted time window

## Important Client Warning

Aldric can target $20 per day on a $200 account, but it cannot guarantee that result. A 10% daily target is aggressive. Some days the correct action is `NO_TRADE`.

// AldricBridgeEA.mq4
// Phase 2 bridge template: MT4 -> Aldric Backend -> MT4.
// Attach to one chart. Add backend URL to MT4: Tools > Options > Expert Advisors > Allow WebRequest.

#property strict

input string BackendBaseUrl = "http://127.0.0.1:5000";
input string BridgeSecret = "change_this_secret";
input string AccountId = "default";
input string SymbolsCsv = "XAUUSD,EURUSD,GBPUSD,USDJPY,GBPJPY,BTCUSD";
input ENUM_TIMEFRAMES SignalTimeframe = PERIOD_M15;
input bool FullAutoLocalEnabled = false;
input int TimerSeconds = 300;
input double RiskPercentage = 2.0;
input double DailyTarget = 20.0;
input double MaxDailyLoss = 10.0;
input int MaxTradesToday = 3;

string Trim(string value) {
   StringTrimLeft(value);
   StringTrimRight(value);
   return value;
}

string TimeframeName(ENUM_TIMEFRAMES tf) {
   if (tf == PERIOD_M1) return "M1";
   if (tf == PERIOD_M5) return "M5";
   if (tf == PERIOD_M15) return "M15";
   if (tf == PERIOD_M30) return "M30";
   if (tf == PERIOD_H1) return "H1";
   if (tf == PERIOD_H4) return "H4";
   if (tf == PERIOD_D1) return "D1";
   return "M15";
}

string JsonEscape(string value) {
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   return value;
}

string PostJson(string path, string body) {
   string headers = "Content-Type: application/json\r\nx-aldric-mt4-secret: " + BridgeSecret + "\r\n";
   char data[];
   char result[];
   string resultHeaders;
   StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   int status = WebRequest("POST", BackendBaseUrl + path, headers, 20000, data, result, resultHeaders);
   if (status == -1) {
      Print("Aldric WebRequest POST failed. Error=", GetLastError(), " Path=", path);
      return "";
   }
   return CharArrayToString(result, 0, -1, CP_UTF8);
}

string GetJson(string path) {
   string headers = "x-aldric-mt4-secret: " + BridgeSecret + "\r\n";
   char data[];
   char result[];
   string resultHeaders;
   int status = WebRequest("GET", BackendBaseUrl + path, headers, 20000, data, result, resultHeaders);
   if (status == -1) {
      Print("Aldric WebRequest GET failed. Error=", GetLastError(), " Path=", path);
      return "";
   }
   return CharArrayToString(result, 0, -1, CP_UTF8);
}

double DailyProfit() {
   double total = 0;
   datetime today = iTime(Symbol(), PERIOD_D1, 0);
   for (int i = OrdersHistoryTotal() - 1; i >= 0; i--) {
      if (OrderSelect(i, SELECT_BY_POS, MODE_HISTORY) && OrderCloseTime() >= today) {
         total += OrderProfit() + OrderSwap() + OrderCommission();
      }
   }
   return total;
}

int TradesToday() {
   int total = 0;
   datetime today = iTime(Symbol(), PERIOD_D1, 0);
   for (int i = OrdersHistoryTotal() - 1; i >= 0; i--) {
      if (OrderSelect(i, SELECT_BY_POS, MODE_HISTORY) && OrderOpenTime() >= today) total++;
   }
   for (int j = OrdersTotal() - 1; j >= 0; j--) {
      if (OrderSelect(j, SELECT_BY_POS, MODE_TRADES) && OrderOpenTime() >= today) total++;
   }
   return total;
}

void SendAccountState() {
   string body = "{";
   body += "\"accountId\":\"" + JsonEscape(AccountId) + "\",";
   body += "\"broker\":\"" + JsonEscape(AccountCompany()) + "\",";
   body += "\"currency\":\"" + JsonEscape(AccountCurrency()) + "\",";
   body += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   body += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
   body += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
   body += "\"freeMargin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
   body += "\"dailyPnl\":" + DoubleToString(DailyProfit(), 2) + ",";
   body += "\"dailyTarget\":" + DoubleToString(DailyTarget, 2) + ",";
   body += "\"currentDrawdown\":" + DoubleToString(AccountBalance() - AccountEquity(), 2) + ",";
   body += "\"maxDailyLoss\":" + DoubleToString(MaxDailyLoss, 2) + ",";
   body += "\"maxTradesToday\":" + IntegerToString(MaxTradesToday) + ",";
   body += "\"tradesToday\":" + IntegerToString(TradesToday()) + ",";
   body += "\"riskPercentage\":" + DoubleToString(RiskPercentage, 2) + ",";
   body += "\"fullAutoEnabled\":" + (FullAutoLocalEnabled ? "true" : "false") + ",";
   body += "\"killSwitch\":false,";
   body += "\"openTrades\":[]";
   body += "}";
   PostJson("/api/mt4/account", body);
}

void SendMarketData(string symbol) {
   RefreshRates();
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   double point = MarketInfo(symbol, MODE_POINT);
   double bid = MarketInfo(symbol, MODE_BID);
   double ask = MarketInfo(symbol, MODE_ASK);
   double spread = MarketInfo(symbol, MODE_SPREAD);
   double tickValue = MarketInfo(symbol, MODE_TICKVALUE);
   double minLot = MarketInfo(symbol, MODE_MINLOT);
   double maxLot = MarketInfo(symbol, MODE_MAXLOT);
   double lotStep = MarketInfo(symbol, MODE_LOTSTEP);
   double stopLevel = MarketInfo(symbol, MODE_STOPLEVEL);
   string tf = TimeframeName(SignalTimeframe);
   int bars = MathMin(iBars(symbol, SignalTimeframe), 220);
   if (bars < 60) {
      Print("Aldric skipped ", symbol, ": insufficient bars.");
      return;
   }

   string candles = "[";
   for (int i = bars - 1; i >= 0; i--) {
      if (i < bars - 1) candles += ",";
      candles += "{";
      candles += "\"time\":\"" + TimeToString(iTime(symbol, SignalTimeframe, i), TIME_DATE|TIME_SECONDS) + "\",";
      candles += "\"open\":" + DoubleToString(iOpen(symbol, SignalTimeframe, i), digits) + ",";
      candles += "\"high\":" + DoubleToString(iHigh(symbol, SignalTimeframe, i), digits) + ",";
      candles += "\"low\":" + DoubleToString(iLow(symbol, SignalTimeframe, i), digits) + ",";
      candles += "\"close\":" + DoubleToString(iClose(symbol, SignalTimeframe, i), digits) + ",";
      candles += "\"tickVolume\":" + DoubleToString(iVolume(symbol, SignalTimeframe, i), 0);
      candles += "}";
   }
   candles += "]";

   string body = "{";
   body += "\"accountId\":\"" + JsonEscape(AccountId) + "\",";
   body += "\"broker\":\"" + JsonEscape(AccountCompany()) + "\",";
   body += "\"symbol\":\"" + JsonEscape(symbol) + "\",";
   body += "\"timeframe\":\"" + tf + "\",";
   body += "\"bid\":" + DoubleToString(bid, digits) + ",";
   body += "\"ask\":" + DoubleToString(ask, digits) + ",";
   body += "\"spread\":" + DoubleToString(spread, 1) + ",";
   body += "\"digits\":" + IntegerToString(digits) + ",";
   body += "\"point\":" + DoubleToString(point, digits) + ",";
   body += "\"metadata\":{";
   body += "\"tickValue\":" + DoubleToString(tickValue, 4) + ",";
   body += "\"minLot\":" + DoubleToString(minLot, 2) + ",";
   body += "\"maxLot\":" + DoubleToString(maxLot, 2) + ",";
   body += "\"lotStep\":" + DoubleToString(lotStep, 2) + ",";
   body += "\"stopLevel\":" + DoubleToString(stopLevel, 1);
   body += "},";
   body += "\"candles\":" + candles + ",";
   body += "\"newsEvents\":[]";
   body += "}";
   PostJson("/api/mt4/market-data", body);
}

string JsonValue(string json, string key) {
   string pattern = "\"" + key + "\":";
   int start = StringFind(json, pattern);
   if (start < 0) return "";
   start += StringLen(pattern);
   while (StringGetCharacter(json, start) == ' ') start++;
   bool quoted = StringGetCharacter(json, start) == '"';
   if (quoted) start++;
   int end = start;
   while (end < StringLen(json)) {
      int ch = StringGetCharacter(json, end);
      if (quoted && ch == '"') break;
      if (!quoted && (ch == ',' || ch == '}')) break;
      end++;
   }
   return StringSubstr(json, start, end - start);
}

void PollAndExecute() {
   if (!FullAutoLocalEnabled) return;
   string response = GetJson("/api/mt4/orders/next?accountId=" + AccountId);
   if (response == "" || StringFind(response, "\"order\":null") >= 0) return;

   string symbol = JsonValue(response, "symbol");
   string direction = JsonValue(response, "direction");
   double lots = StrToDouble(JsonValue(response, "lotSize"));
   double sl = StrToDouble(JsonValue(response, "stopLoss"));
   double tp = StrToDouble(JsonValue(response, "takeProfit"));
   string orderId = JsonValue(response, "id");
   int type = direction == "BUY" ? OP_BUY : OP_SELL;
   double price = direction == "BUY" ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);

   if (lots <= 0 || sl <= 0 || tp <= 0) {
      Print("Aldric refused malformed order.");
      return;
   }

   int ticket = OrderSend(symbol, type, lots, price, 20, sl, tp, "ALDRIC:" + orderId, 0, 0, clrDeepSkyBlue);
   if (ticket < 0) {
      Print("Aldric OrderSend failed. Error=", GetLastError());
      return;
   }
   Print("Aldric executed order ticket=", ticket, " orderId=", orderId);
}

void ScanForSignals() {
   string body = "{";
   body += "\"accountId\":\"" + JsonEscape(AccountId) + "\",";
   body += "\"timeframe\":\"" + TimeframeName(SignalTimeframe) + "\"";
   body += "}";
   PostJson("/api/mt4/scan", body);
}

void OnInit() {
   EventSetTimer(TimerSeconds);
   Print("AldricBridgeEA initialized. FullAutoLocalEnabled=", FullAutoLocalEnabled);
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

void OnTimer() {
   SendAccountState();
   string symbols[];
   int count = StringSplit(SymbolsCsv, ',', symbols);
   for (int i = 0; i < count; i++) {
      string symbol = Trim(symbols[i]);
      if (symbol != "") SendMarketData(symbol);
   }
   ScanForSignals();
   PollAndExecute();
}

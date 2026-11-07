# Chartink → TradingView Automation

Chartink-ல் save பண்ணிருக்கற எல்லா scans ஐயும் automatically run பண்ணி, வந்த stocks ஐ TradingView watchlist-ல் import பண்ணும்.

---

## 📂 Project Files

| File | Purpose |
|------|---------|
| `main.js` | Main automation script |
| `chartink.js` | Chartink scan runner |
| `tradingview.js` | TradingView watchlist importer |
| `config.js` | Settings (delays, watchlist name, etc.) |
| `RUN.bat` | Double-click to run |
| `chartink_results.txt` | Output file (auto-created after run) |

---

## 🚀 How to Run

### Method 1 — Chrome Close பண்ணி Run (Easiest)

1. **Google Chrome close பண்ணு** (completely quit)
2. **`RUN.bat` double-click பண்ணு**
3. Chrome automatically open ஆகும் — உன் existing login session use பண்ணும்
4. எல்லா scans run ஆகும், TradingView-ல் import ஆகும்

---

### Method 2 — Chrome Open-ஆ இருக்கும்போதே Run

Chrome-ஐ close பண்ண வேண்டாம். இந்த shortcut create பண்ணு:

1. Chrome shortcut → Right click → Properties
2. Target field-ல் இந்த flag add பண்ணு:
   ```
   --remote-debugging-port=9222
   ```
   Example:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
   ```
3. Chrome இந்த shortcut மூலம் open பண்ணு
4. Chartink-ல் login பண்ணு
5. `RUN.bat` run பண்ணு — Chrome open-ஆ இருந்தாலும் connect ஆகும்!

---

## ⚙️ Config Customization (`config.js`)

```js
// Specific scans மட்டும் run பண்ண:
SCANS_TO_RUN: ["Antigravity - Filter 2", "Antigravity -Filter 5"]

// எல்லா scans run பண்ண:
SCANS_TO_RUN: []

// TradingView watchlist name மாத்த:
TRADINGVIEW_WATCHLIST_NAME: "My Signals"

// Internet slow-ஆ இருந்தா delay increase பண்ணு (ms):
SCAN_RUN_WAIT: 6000
```

---

## 📊 Output

- **Console** — real-time progress
- **`chartink_results.txt`** — scan-wise breakdown + all symbols in `NSE:SYMBOL` format

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Profile already in use" | Chrome close பண்ணி retry பண்ணு |
| Scan results empty | Chartink page-ல் manually run பண்ணி table structure பாரு; `config.js`-ல் `SCAN_RUN_WAIT` increase பண்ணு |
| TradingView import fail | `chartink_results.txt` open பண்ணி manually TradingView → Watchlist → Import list → Paste |
| Login not detected | Chartink-ல் manually login பண்ணி, Chrome close பண்ணாம script run பண்ணு (Method 2) |

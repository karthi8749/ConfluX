// ============================================================
//  config.js — Updated for Desktop Apps (No Chrome browser)
// ============================================================

module.exports = {
  // ── CHARTINK CREDENTIALS (Auto-login) ───────────────────
  CHARTINK_EMAIL: "baasha8749@gmail.com",
  CHARTINK_PASSWORD: "karthi8749@",

  // ── CHARTINK PWA ──────────────────────────────────────────
  // Chrome profile that has Chartink PWA installed & logged in
  CHROME_USER_DATA_DIR: "C:\\Users\\karthi\\AppData\\Local\\Google\\Chrome\\User Data",
  CHROME_PROFILE: "Default",
  CHARTINK_APP_ID: "gjcdohggmneclmkkbohjhfhakibafidn",  // Chartink PWA app-id
  CHARTINK_SCANS_URL: "https://chartink.com/screener/",

  // ── TRADINGVIEW ELECTRON APP ──────────────────────────────
  TRADINGVIEW_EXE: "C:\\Program Files\\WindowsApps\\31178TradingViewInc.TradingView_3.5.0.0_x64__q4jpyh43s5mv6\\TradingView.exe",
  TRADINGVIEW_APP_ID: "31178TradingViewInc.TradingView_q4jpyh43s5mv6!TradingView.Desktop",

  // Remote debugging ports
  CHARTINK_DEBUG_PORT: 9222,
  TRADINGVIEW_DEBUG_PORT: 9223,

  // ── SCAN FILTER ───────────────────────────────────────────
  // Leave [] to run ALL saved scans
  // Example: ["Antigravity - Filter 2", "Antigravity -Filter 5"]
  SCANS_TO_RUN: [],

  // ── WATCHLIST ─────────────────────────────────────────────
  TRADINGVIEW_WATCHLIST_NAME: "Chartink Signals",

  // ── OUTPUT ────────────────────────────────────────────────
  OUTPUT_FILE: "chartink_results.txt",

  // ── DELAYS (ms) ───────────────────────────────────────────
  PAGE_LOAD_WAIT:   2000,
  SCAN_RUN_WAIT:    4000,
  BETWEEN_SCANS:    1000,
  APP_LAUNCH_WAIT:  5000,  // Wait for app to open

  HEADLESS: false,
};

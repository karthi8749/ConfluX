// ============================================================
//  tradingview.js — Watchlists & Interactive Hub Manager
//  Fetches Candles and Generates Chartink + PineScripts Dashboard
// ============================================================

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { generateDashboardHtml } = require("./dashboard_generator");
const { fetchAllCandles } = require("./candle_fetcher");

class TradingViewManager {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generates scan-wise watchlists and the interactive visual dashboard
   */
  async importSymbols(results) {
    const watchlistsDir = path.resolve("watchlists");
    if (!fs.existsSync(watchlistsDir)) {
      fs.mkdirSync(watchlistsDir, { recursive: true });
    }

    const allUnique = [];
    const seen = new Set();
    let index = 1;

    console.log("\n[TradingView] Creating filter-wise watchlists (Max 30 stocks per file for Basic Plan)...");

    // 1. Generate a separate watchlist .txt for each filter
    for (const [scanName, stocks] of Object.entries(results)) {
      if (!Array.isArray(stocks) || stocks.length === 0) continue;

      const sanitizedName = scanName.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 30);
      const fileName = `${index}_${sanitizedName}.txt`;
      const filePath = path.join(watchlistsDir, fileName);

      // TradingView format
      const symbolsText = stocks.map((s) => `NSE:${s.symbol}`).join("\n");
      fs.writeFileSync(filePath, symbolsText, "utf-8");
      console.log(`  📁 [${stocks.length} stocks] ${fileName}`);

      // Collect unique symbols
      for (const s of stocks) {
        if (!seen.has(s.symbol)) {
          seen.add(s.symbol);
          allUnique.push(s.symbol);
        }
      }
      index++;
    }

    // 2. Generate Top 30 Unique stocks file (guaranteed to fit TradingView Basic 30 limit)
    const top30 = allUnique.slice(0, 30);
    const top30Path = path.join(watchlistsDir, "Top_30_Unique_Stocks.txt");
    fs.writeFileSync(top30Path, top30.map((s) => `NSE:${s}`).join("\n"), "utf-8");
    console.log(`  ⭐ [Top ${top30.length} stocks] Top_30_Unique_Stocks.txt (Safe for TV Basic Plan)`);

    // 3. Copy Top 30 to Windows Clipboard
    try {
      const clipboardText = top30.map((s) => `NSE:${s}`).join(", ");
      const escaped = clipboardText.replace(/"/g, '""');
      execSync(`powershell -command "Set-Clipboard -Value '${escaped}'"`, {
        stdio: "ignore",
      });
      console.log(`\n  ✅ Top ${top30.length} unique stocks copied to Clipboard!`);
    } catch (_) {}

    // 4. Fetch 1-year daily candles for all stocks to power your 2 PineScripts
    console.log("[Candles] Fetching historical candlestick data for all stocks...");
    let candleMap = {};
    try {
      candleMap = await fetchAllCandles(allUnique);
    } catch (e) {
      console.log("  [Candles] Notice:", e.message);
    }

    // 5. Generate Interactive Visual Dashboard with PineScripts Engine
    const dashboardPath = path.resolve("dashboard.html");
    const indexPath = path.resolve("index.html");
    const htmlContent = generateDashboardHtml(results, { totalUnique: allUnique.length }, candleMap);
    fs.writeFileSync(dashboardPath, htmlContent, "utf-8");
    fs.writeFileSync(indexPath, htmlContent, "utf-8");
    console.log(`\n[Dashboard] 🌐 ConfluX Dashboard created with your 2 PineScripts: ${dashboardPath}`);

    // 6. Automatically open Dashboard in default browser
    try {
      execSync(`powershell -command "Start-Process '${dashboardPath}'"`, {
        stdio: "ignore",
      });
      console.log("  🚀 ConfluX Dashboard opened in your browser!");
    } catch (_) {}
  }
}

module.exports = TradingViewManager;

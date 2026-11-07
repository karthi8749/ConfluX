// ============================================================
//  main.js — Chartink to TradingView Automated Workflow
// ============================================================

const config = require("./config");
const ChartinkScanner = require("./chartink");
const TradingViewManager = require("./tradingview");
const { launchChartinkApp, sleep } = require("./launcher");
const fs = require("fs");
const path = require("path");

function saveResultsToFile(results) {
  const lines = [];
  const allSymbols = new Set();

  lines.push("═".repeat(65));
  lines.push(`CHARTINK SCAN RESULTS (BY FILTER) — ${new Date().toLocaleString("en-IN")}`);
  lines.push("═".repeat(65));

  for (const [scanName, stocks] of Object.entries(results)) {
    lines.push(`\n📋 FILTER: ${scanName} (${stocks.length} stocks)`);
    lines.push("-".repeat(50));
    if (stocks.length > 0) {
      stocks.forEach((s, idx) => {
        lines.push(
          `  ${(idx + 1).toString().padStart(2)}. NSE:${s.symbol.padEnd(15)} | ${s.name.padEnd(25)} | LTP: ₹${(s.price || "-").padEnd(8)} | ${s.change || "-"}`
        );
        allSymbols.add(s.symbol);
      });
    } else {
      lines.push("  (No stocks matched this filter)");
    }
  }

  lines.push("\n" + "═".repeat(65));
  lines.push(`TOTAL UNIQUE SYMBOLS (${allSymbols.size} stocks):`);
  lines.push("═".repeat(65));
  lines.push([...allSymbols].map((s) => `NSE:${s}`).join("\n"));

  fs.writeFileSync(config.OUTPUT_FILE, lines.join("\n"), "utf-8");
  console.log(`\n📄 Detailed scan report saved to: ${path.resolve(config.OUTPUT_FILE)}`);
  return [...allSymbols];
}

function printSummary(results, allSymbols) {
  console.log("\n" + "═".repeat(55));
  console.log("📊 RUN SUMMARY BY FILTER");
  console.log("═".repeat(55));
  for (const [scan, stocks] of Object.entries(results)) {
    const icon = stocks.length > 0 ? "✅" : "⬜";
    console.log(`  ${icon} ${scan.padEnd(35)} : ${stocks.length} stocks`);
  }
  console.log("─".repeat(55));
  console.log(`🎯 Total Unique Stocks: ${allSymbols.length}`);
  console.log("═".repeat(55));
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   CHARTINK → TRADINGVIEW AUTOMATION  🚀      ║");
  console.log("║   (Filter Breakdown & TV Basic Plan Safe)    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  let browser = null;

  try {
    // ══════════════════════════════════════════════════════
    // PHASE 1: Launch Chartink & Auto-authenticate
    // ══════════════════════════════════════════════════════
    console.log("▶ PHASE 1: Launching Chartink & Checking Session...");
    const { context, page } = await launchChartinkApp(config);
    browser = context._browser;

    // ══════════════════════════════════════════════════════
    // PHASE 2: Execute all saved scans
    // ══════════════════════════════════════════════════════
    console.log("\n▶ PHASE 2: Running all saved scans...");
    const scanner = new ChartinkScanner(page, config);
    const results = await scanner.runAllScans(config.SCANS_TO_RUN);

    if (!results || Object.keys(results).length === 0) {
      console.log("\n⚠️  No scans found to run.");
      return;
    }

    const allSymbols = saveResultsToFile(results);
    printSummary(results, allSymbols);

    // ══════════════════════════════════════════════════════
    // PHASE 3: Generate Filter-wise Watchlists & Dashboard
    // ══════════════════════════════════════════════════════
    console.log("\n▶ PHASE 3: Generating Filter Watchlists & Dashboard...");
    const tvManager = new TradingViewManager(config);
    await tvManager.importSymbols(results);

    console.log("🎉 All scans completed successfully!");

  } catch (err) {
    console.error("\n❌ Error during automation:", err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    if (browser) {
      console.log("\n[Cleanup] Closing background browser...");
      await sleep(2000);
      await browser.close();
    }
  }
}

main();

// ============================================================
//  chartink.js — Enhanced Chartink Scanner (Full Stock Details)
// ============================================================

class ChartinkScanner {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  /**
   * Fetches all saved scans from the Scan Dashboard
   */
  async getAllSavedScans() {
    console.log("\n[Chartink] Loading scans from Scan Dashboard...");
    await this.page.goto("https://chartink.com/scan_dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await this.page.waitForTimeout(2000);

    const scans = await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      const list = [];
      const seen = new Set();

      for (const r of rows) {
        const link = r.querySelector("td a, th a");
        if (!link) continue;
        const name = link.innerText.trim();
        const url = link.href;

        if (name && url && url.includes("/screener/") && !seen.has(url)) {
          seen.add(url);
          list.push({ name, url });
        }
      }
      return list;
    });

    console.log(`[Chartink] Found ${scans.length} saved scans:`);
    scans.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
    return scans;
  }

  /**
   * Runs an individual scan and extracts full stock details
   */
  async runScanAndGetSymbols(scan) {
    console.log(`\n[Chartink] Running scan: "${scan.name}"`);
    try {
      await this.page.goto(scan.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await this.page.waitForTimeout(1500);
    } catch (e) {
      console.log(`  [ERROR] Cannot open scan: ${e.message}`);
      return [];
    }

    // Click "Run Scan" button
    try {
      const runBtn = await this.page.$(
        'button:has-text("Run Scan"), input[value*="Run Scan"], button#run_scan, button.btn-success'
      );
      if (runBtn) {
        await runBtn.click();
        console.log("  Clicked [Run Scan] button...");
      }
    } catch (_) {}

    // Wait for the results table to populate
    try {
      await this.page.waitForSelector(
        "table.scan-results-table tbody tr, table.vgt-table tbody tr, #DataTables_Table_0 tbody tr",
        { timeout: 7000 }
      );
    } catch (_) {}

    await this.page.waitForTimeout(1500);

    return await this._extractStockDetails();
  }

  async _extractStockDetails() {
    const stocks = await this.page.evaluate(() => {
      const extracted = [];
      const seenSymbols = new Set();

      const tables = document.querySelectorAll(
        "table.scan-results-table, table.vgt-table, #DataTables_Table_0, table.dataTable"
      );

      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        for (const row of rows) {
          const text = row.innerText.trim();
          if (!text || text.toLowerCase().includes("no records found") || text.toLowerCase().includes("no data")) {
            continue;
          }

          const cells = Array.from(row.querySelectorAll("td")).map((c) => c.innerText.trim());
          if (cells.length >= 3) {
            // cell[0]=Sr, cell[1]=Stock Name, cell[2]=Symbol, cell[3]=Price, cell[4]=Change%, cell[5]=Volume
            let name = (cells[1] || "").split("\n")[0].trim();
            let symbol = (cells[2] || "").trim().toUpperCase();
            let price = cells[3] || "-";
            let change = cells[4] || "-";
            let volume = cells[5] || "-";

            // Validation
            if (symbol && symbol.length >= 2 && symbol.length <= 25 && /^[A-Z0-9&.\-]+$/.test(symbol) && !seenSymbols.has(symbol)) {
              seenSymbols.add(symbol);
              extracted.push({
                symbol,
                name: name || symbol,
                price,
                change,
                volume,
              });
              continue;
            }
          }

          // Fallback: search for symbol inside links
          const links = Array.from(row.querySelectorAll("a"));
          for (const link of links) {
            const sym = link.innerText.trim().toUpperCase();
            if (sym && sym.length >= 2 && sym.length <= 25 && /^[A-Z0-9&.\-]+$/.test(sym) && !sym.includes(" ") && !seenSymbols.has(sym)) {
              seenSymbols.add(sym);
              extracted.push({
                symbol: sym,
                name: sym,
                price: "-",
                change: "-",
                volume: "-",
              });
            }
          }
        }
      }

      return extracted;
    });

    const symbolList = stocks.map((s) => s.symbol);
    console.log(
      `  → ${stocks.length} stocks: ${stocks.length > 0 ? symbolList.slice(0, 8).join(", ") + (stocks.length > 8 ? "..." : "") : "(none)"}`
    );
    return stocks;
  }

  async runAllScans(filter = []) {
    let scans = await this.getAllSavedScans();
    if (filter && filter.length > 0) {
      scans = scans.filter((s) => filter.includes(s.name));
      console.log(`[Filter] Will run ${scans.length} selected scans`);
    }

    const results = {};
    for (let i = 0; i < scans.length; i++) {
      console.log(`\n━━━━━━━━ Scan ${i + 1}/${scans.length} ━━━━━━━━`);
      const stocks = await this.runScanAndGetSymbols(scans[i]);
      results[scans[i].name] = stocks;
      await this.page.waitForTimeout(this.config.BETWEEN_SCANS || 1000);
    }
    return results;
  }
}

module.exports = ChartinkScanner;

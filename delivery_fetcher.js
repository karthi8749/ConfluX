// ============================================================
//  delivery_fetcher.js — NSE Daily Delivery Percentage Engine
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "delivery_data.json");

function fetchBhavcopyForDate(dateStr) {
  return new Promise((resolve) => {
    const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${dateStr}.csv`;
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,text/csv,*/*",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ url, dateStr, data: raw }));
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + mm + yyyy;
}

/**
 * Fetches the latest delivery percentage data for all NSE stocks
 */
async function fetchLatestDeliveryMap() {
  console.log("\n[Delivery] Fetching official NSE delivery percentage bhavcopy...");
  const now = new Date();

  // Try today and prior days (to handle weekends, holidays, after-hours)
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(now.getTime() - offset * 86400000);
    const dateStr = formatDate(d);
    const res = await fetchBhavcopyForDate(dateStr);

    if (res && res.data && res.data.length > 5000) {
      console.log(`  ✅ Loaded NSE Delivery Report for ${dateStr} (${(res.data.length / 1024).toFixed(1)} KB)`);
      const lines = res.data.split("\n");
      const deliveryMap = {};

      // CSV Header: SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS, NO_OF_TRADES, DELIV_QTY, DELIV_PER
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 15) {
          const sym = parts[0].toUpperCase();
          const series = parts[1];
          // Prefer EQ (Equity) series, fallback to others
          if (!deliveryMap[sym] || series === "EQ") {
            const delivPer = parts[14];
            const delivQty = parts[13];
            if (delivPer && delivPer !== "-" && delivPer !== "") {
              const num = parseFloat(delivPer);
              if (!isNaN(num)) {
                deliveryMap[sym] = {
                  deliveryPercent: num,
                  deliveryQty: delivQty,
                  date: parts[2],
                };
              }
            }
          }
        }
      }

      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(deliveryMap, null, 2), "utf-8");
      } catch (_) {}

      console.log(`  ✅ Successfully indexed delivery percentage for ${Object.keys(deliveryMap).length} NSE stocks`);
      return deliveryMap;
    }
  }

  // Fallback to cache if network request failed
  if (fs.existsSync(CACHE_FILE)) {
    console.log("  ⚠️ Network fetch failed, falling back to cached delivery data...");
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch (_) {}
  }

  return {};
}

/**
 * Enriches stock records in results with delivery percentages
 */
function attachDeliveryToResults(results, deliveryMap = {}) {
  let matchedCount = 0;
  let totalCount = 0;

  for (const scanStocks of Object.values(results)) {
    if (!Array.isArray(scanStocks)) continue;
    for (const s of scanStocks) {
      totalCount++;
      const sym = (s.symbol || "").toUpperCase();
      const d = deliveryMap[sym];
      if (d && typeof d.deliveryPercent === "number") {
        s.delivery = `${d.deliveryPercent.toFixed(1)}%`;
        matchedCount++;
      } else if (!s.delivery) {
        s.delivery = "-";
      }
    }
  }

  console.log(`[Delivery] Attached delivery percentage to ${matchedCount}/${totalCount} stock instances in results`);
  return results;
}

module.exports = {
  fetchLatestDeliveryMap,
  attachDeliveryToResults,
};

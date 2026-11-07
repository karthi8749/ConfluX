// ============================================================
//  candle_fetcher.js — Fetches historical daily candles from Yahoo Finance
// ============================================================

const https = require("https");

function fetchSingleStockCandles(symbol) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=1y&interval=1d`;
    
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      },
      timeout: 8000
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const result = json.chart.result && json.chart.result[0];
          if (!result || !result.timestamp) {
            return resolve({ symbol, candles: [] });
          }

          const quote = result.indicators.quote[0];
          const timestamps = result.timestamp;
          const candles = [];

          for (let i = 0; i < timestamps.length; i++) {
            const o = quote.open[i];
            const h = quote.high[i];
            const l = quote.low[i];
            const c = quote.close[i];
            const v = quote.volume[i] || 0;

            if (o != null && h != null && l != null && c != null) {
              const d = new Date(timestamps[i] * 1000);
              const dateStr = d.toISOString().split("T")[0];
              candles.push({
                time: dateStr,
                open: Math.round(o * 100) / 100,
                high: Math.round(h * 100) / 100,
                low: Math.round(l * 100) / 100,
                close: Math.round(c * 100) / 100,
                volume: v
              });
            }
          }
          resolve({ symbol, candles });
        } catch (_) {
          resolve({ symbol, candles: [] });
        }
      });
    });

    req.on("error", () => resolve({ symbol, candles: [] }));
    req.on("timeout", () => { req.destroy(); resolve({ symbol, candles: [] }); });
  });
}

/**
 * Fetches candle data for a list of symbols in parallel batches
 */
async function fetchAllCandles(symbols, batchSize = 10) {
  const uniqueSymbols = [...new Set(symbols)];
  console.log(`[Candles] Fetching 1-year historical candles for ${uniqueSymbols.length} stocks...`);
  const candleMap = {};

  for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
    const batch = uniqueSymbols.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fetchSingleStockCandles));
    results.forEach(({ symbol, candles }) => {
      if (candles.length > 0) {
        candleMap[symbol] = candles;
      }
    });
  }

  console.log(`[Candles] Successfully loaded candles for ${Object.keys(candleMap).length}/${uniqueSymbols.length} stocks!`);
  return candleMap;
}

module.exports = { fetchAllCandles };

// ============================================================
//  server.js — ConfluX Background Local Runner & API Server
//  Allows dashboard.html to trigger RUN.bat / node main.js with percentage tracking
// ============================================================

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 3847;
let isRunning = false;
let progressPercent = 0;
let statusText = "Ready";
let totalScans = 8;
let lastRunTime = null;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      running: isRunning,
      percent: progressPercent,
      text: statusText,
      lastRunTime
    }));
    return;
  }

  if (url.pathname === "/run") {
    if (isRunning) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ started: false, running: true, percent: progressPercent, text: statusText }));
      return;
    }

    isRunning = true;
    progressPercent = 5;
    statusText = "Starting... (5%)";
    console.log("[Server] Received trigger to run scans...");

    const child = spawn("node", ["main.js"], {
      cwd: __dirname,
      shell: true,
      stdio: "pipe",
    });

    child.stdout.on("data", (data) => {
      const text = data.toString();
      process.stdout.write(text);

      // Parse progress from output
      if (text.includes("PHASE 1") || text.includes("Launching Chartink")) {
        progressPercent = 10;
        statusText = "Logging in... (10%)";
      } else if (text.includes("Found") && text.includes("saved scans")) {
        const m = text.match(/Found\s+(\d+)\s+saved scans/i);
        if (m) totalScans = parseInt(m[1], 10) || 8;
        progressPercent = 15;
        statusText = `Starting Scans (15%)`;
      } else if (text.includes("Scan ") && text.includes("/")) {
        const m = text.match(/Scan\s+(\d+)\/(\d+)/i);
        if (m) {
          const cur = parseInt(m[1], 10);
          const tot = parseInt(m[2], 10);
          totalScans = tot;
          progressPercent = Math.min(80, Math.round(15 + (cur / tot) * 65));
          statusText = `Scan ${cur}/${tot} (${progressPercent}%)`;
        }
      } else if (text.includes("Candles") || text.includes("candle_fetcher") || text.includes("candlestick")) {
        progressPercent = 85;
        statusText = "Candles (85%)";
      } else if (text.includes("TradingView") || text.includes("watchlists")) {
        progressPercent = 92;
        statusText = "Watchlists (92%)";
      } else if (text.includes("Dashboard") || text.includes("dashboard")) {
        progressPercent = 98;
        statusText = "Finalizing (98%)";
      }
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    child.on("close", (code) => {
      isRunning = false;
      progressPercent = 100;
      statusText = "Complete! (100%)";
      lastRunTime = new Date().toLocaleTimeString("en-IN");
      console.log(`[Server] main.js finished with code ${code}`);
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ started: true, running: true, percent: progressPercent, text: statusText }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`⚡ ConfluX Local Runner active on http://127.0.0.1:${PORT}`);
});

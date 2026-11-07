// ============================================================
//  cookie-login.js — Extract Chartink cookies from Chrome
//  and save them for Playwright to use
//
//  Run ONCE: node cookie-login.js
//  Then run: node main.js (uses saved cookies)
// ============================================================

const { chromium } = require("playwright");
const fs = require("fs");

const COOKIES_FILE = "chartink_cookies.json";

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   CHARTINK LOGIN — One-time Setup            ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log("A browser window will open.");
  console.log("Please LOG IN to Chartink, then come back here and press ENTER.\n");

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();
  await page.goto("https://chartink.com/screener/");

  console.log("⏳ Waiting for you to log in...");
  console.log("   After login, press ENTER here.\n");

  // Wait for user input
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
    process.stdout.write("Press ENTER after login: ");
  });

  // Save cookies
  const cookies = await context.cookies();
  const storage = await context.storageState();

  fs.writeFileSync(COOKIES_FILE, JSON.stringify(storage, null, 2));
  console.log(`\n✅ Login saved to ${COOKIES_FILE}`);
  console.log("   Now run: node main.js\n");

  await browser.close();
  process.exit(0);
})();

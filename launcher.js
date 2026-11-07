// ============================================================
//  launcher.js — Automated Browser Launcher & Login Manager
// ============================================================

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const COOKIES_FILE = path.join(__dirname, "chartink_cookies.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Perform automated login using email and password
 */
async function autoLogin(page, context, config) {
  console.log("[Login] Logging into Chartink automatically...");
  await page.goto("https://chartink.com/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Fill credentials
  await page.fill("#login-email", config.CHARTINK_EMAIL);
  await page.fill("#login-password", config.CHARTINK_PASSWORD);

  try {
    const rememberCheckbox = await page.$("#remember");
    if (rememberCheckbox) await rememberCheckbox.check();
  } catch (_) {}

  // Click login
  const submitBtn = await page.$(
    'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Login")'
  );
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.keyboard.press("Enter");
  }

  console.log("[Login] Submitted login credentials. Waiting...");
  await page.waitForTimeout(4000);

  // Save state
  await context.storageState({ path: COOKIES_FILE });
  console.log("[Login] ✅ Login successful and session saved!");
}

/**
 * Launch Chromium with saved session, or auto-login if needed
 */
async function launchChartinkApp(config) {
  const hasSavedSession = fs.existsSync(COOKIES_FILE);
  const isCI = !!process.env.CI;

  const browser = await chromium.launch({
    headless: isCI ? true : (config.HEADLESS || false),
    args: isCI
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
      : ["--start-maximized", "--disable-blink-features=AutomationControlled"],
  });

  let context;
  if (hasSavedSession) {
    context = await browser.newContext({
      storageState: COOKIES_FILE,
      viewport: isCI ? { width: 1280, height: 800 } : null,
    });
  } else {
    context = await browser.newContext({ viewport: isCI ? { width: 1280, height: 800 } : null });
  }

  context._browser = browser;
  const page = await context.newPage();

  // Verify if session is valid by visiting dashboard
  await page.goto("https://chartink.com/scan_dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await sleep(2000);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    console.log("[Auth] Session not active, performing automated login...");
    await autoLogin(page, context, config);
    // After login, return to scan dashboard
    await page.goto("https://chartink.com/scan_dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000);
  } else {
    console.log("[Auth] ✅ Logged in with saved session!");
  }

  return { context, page };
}

module.exports = { launchChartinkApp, sleep };

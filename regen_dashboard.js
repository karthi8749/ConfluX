const fs = require('fs');
const path = require('path');
const { generateDashboardHtml } = require('./dashboard_generator.js');
const { fetchLatestDeliveryMap, attachDeliveryToResults } = require('./delivery_fetcher.js');

(async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const dataMatch = html.match(/const data = (\{[\s\S]*?\});\r?\n\s*const candleStore = (\{[\s\S]*?\});/);

  if (!dataMatch) {
    console.error('Failed to match data and candleStore');
    process.exit(1);
  }

  const data = JSON.parse(dataMatch[1]);
  const candleStore = JSON.parse(dataMatch[2]);

  // Attach delivery percentages
  const deliveryMap = await fetchLatestDeliveryMap();
  attachDeliveryToResults(data, deliveryMap);

  let scanTime = new Date();
  try {
    if (fs.existsSync('cached_data.json')) {
      scanTime = fs.statSync('cached_data.json').mtime;
    }
  } catch (_) {}
  const scanDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(scanTime);
  const scanDateDisplay = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(scanTime);

  const uniqueSyms = new Set();
  Object.values(data).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(s => s && s.symbol && uniqueSyms.add(s.symbol));
  });

  const newHtml = generateDashboardHtml(data, {
    totalUnique: uniqueSyms.size || 145,
    scanId: String(scanTime.getTime()),
    scanDate,
    scanDateDisplay
  }, candleStore);

  fs.writeFileSync('index.html', newHtml, 'utf8');
  fs.writeFileSync('dashboard.html', newHtml, 'utf8');
  fs.writeFileSync('cached_data.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Successfully regenerated index.html and dashboard.html with Delivery % column! Length:', newHtml.length);
})();

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

  const newHtml = generateDashboardHtml(data, { totalUnique: 145 }, candleStore);

  fs.writeFileSync('index.html', newHtml, 'utf8');
  fs.writeFileSync('dashboard.html', newHtml, 'utf8');
  fs.writeFileSync('cached_data.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Successfully regenerated index.html and dashboard.html with Delivery % column! Length:', newHtml.length);
})();

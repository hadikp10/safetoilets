const { chromium } = require('playwright');
(async () => {
  console.log('Launching browser...');
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    console.log('Navigating to http://localhost:3000/ ...');
    await page.goto('http://localhost:3000/');
    console.log('Waiting for 5 seconds...');
    await page.waitForTimeout(5000);
    
    console.log('Navigating to http://localhost:3000/add ...');
    await page.goto('http://localhost:3000/add');
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('Browser closed.');
  } catch (err) {
    console.error('Error running browser script:', err);
  }
})();

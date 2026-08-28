const { chromium } = require('playwright'); // Assume playwright is installed or we use standard fetch... wait, I can just use playwright since this is my local test environment if it has it. Or I'll use puppeteer.

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@test.com'); // We registered this earlier
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');

  await page.waitForNavigation();
  
  await page.goto('http://localhost:3000/admin/orders');
  await page.waitForSelector('text=+ New Manual Order');
  
  console.log("Clicking + New Manual Order...");
  await page.click('text=+ New Manual Order');
  
  // Wait to see if error pops up
  await page.waitForTimeout(2000);
  
  // Check if modal exists
  const modalHTML = await page.evaluate(() => {
    const modal = document.querySelector('form');
    return modal ? modal.innerHTML : 'No form found';
  });
  console.log("Modal HTML:", modalHTML.substring(0, 500));
  
  await browser.close();
}

test().catch(console.error);

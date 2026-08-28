const { chromium } = require('playwright');
const fs = require('fs');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    await page.waitForNavigation();
    
    console.log("Navigating to orders...");
    await page.goto('http://localhost:3000/admin/orders');
    await page.waitForSelector('text=+ New Manual Order');
    
    console.log("Clicking button...");
    await page.click('text=+ New Manual Order');
    
    // Wait for the modal to be visible!
    await page.waitForSelector('form >> text=Table', { timeout: 3000 }).catch(() => console.log('Modal form not found!'));

    await page.screenshot({ path: 'modal_success.png' });
    console.log("Successfully took screenshot!");
  } catch (error) {
    console.error("Error encountered:", error);
    await page.screenshot({ path: 'modal_error_state.png' });
  } finally {
    await browser.close();
  }
}

capture();

/**
 * Slot availability checker - runs in GitHub Actions.
 * Flow: InstaHelp page → Add "1 hour" → Done → View Cart → Select time & date → check
 * Writes result to auth/result.json for the notify script.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, '..', 'auth');
const resultPath = path.join(authDir, 'result.json');

function writeResult(result) {
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  result.timestamp = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
}

async function screenshot(page, name) {
  try {
    await page.screenshot({ path: path.join(authDir, `screenshot-${name}.png`), fullPage: true });
    console.log(`  screenshot: ${name}`);
  } catch (e) {
    console.log(`  screenshot failed: ${e.message}`);
  }
}

async function main() {
  const sessionData = process.env.UC_SESSION;
  if (!sessionData) {
    writeResult({ status: 'error', message: 'UC_SESSION secret not configured.' });
    process.exit(1);
  }

  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  const sessionPath = path.join(authDir, 'session.json');
  fs.writeFileSync(sessionPath, sessionData);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: sessionPath,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Step 1: Go to InstaHelp category page
    console.log('Step 1: Opening InstaHelp page...');
    await page.goto('https://www.urbancompany.com/cart?city=city_hyderabad_v2&category=insta_maids', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(4000);
    await screenshot(page, '01-category');

    // Check session expiry
    if ((await page.locator('text=Enter your phone number').count()) > 0) {
      writeResult({
        status: 'session_expired',
        message: 'UC session expired. Run "npm run login" locally and update UC_SESSION secret.',
      });
      return;
    }

    // Check if item is already in cart (persistent session)
    const viewCartBtnEarly = page.locator('text=View Cart').first();
    let alreadyInCart = false;
    try {
      await viewCartBtnEarly.waitFor({ timeout: 3000 });
      alreadyInCart = true;
      console.log('Item already in cart, skipping Add steps...');
    } catch (e) {
      // Not in cart, proceed to add
    }

    if (!alreadyInCart) {
      // Step 2: Click "Add" next to "Insta Help" (80x36 button)
      console.log('Step 2: Clicking Add on Insta Help...');
      const instaHelpAdd = page.locator('button[aria-label="Add"]').first();
      await instaHelpAdd.waitFor({ timeout: 10000 });
      await instaHelpAdd.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '02-options-dialog');

      // Step 3: In the dialog, click "Add" under "1 hour" (64x32 button)
      console.log('Step 3: Selecting 1 hour option...');
      await page.locator('text=1 hour').first().waitFor({ timeout: 5000 });
      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[aria-label="Add"]');
        for (const btn of buttons) {
          if (btn.style.width === '64px' && btn.style.height === '32px') {
            btn.click();
            return true;
          }
        }
        return false;
      });
      console.log('  Clicked 1hr Add: ' + clicked);
      await page.waitForTimeout(2000);
      await screenshot(page, '03-after-1hr-add');

      // Step 4: Click "Done" button
      console.log('Step 4: Clicking Done...');
      const doneButton = page.locator('button[aria-label="Done"]');
      if ((await doneButton.count()) > 0) {
        await doneButton.click();
        console.log('  Clicked Done');
        await page.waitForTimeout(2000);
      }
      await screenshot(page, '04-after-done');
    }

    // Step 5: Click "View Cart"
    console.log('Step 5: Clicking View Cart...');
    const viewCartButton = page.locator('text=View Cart').first();
    await viewCartButton.waitFor({ timeout: 5000 });
    await viewCartButton.click();
    await page.waitForTimeout(4000);
    await screenshot(page, '05-checkout');
    console.log('  URL: ' + page.url());

    // Step 5b: Select address if needed
    const selectAddrBtn = page.locator('button[aria-label="Select address"]');
    if ((await selectAddrBtn.count()) > 0) {
      console.log('Step 5b: Clicking Select address...');
      await selectAddrBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '05b-address-picker');

      // Click the address row (the parent clickable container, not the disabled radio)
      const addressRow = page.locator('div[tabindex="0"]:has(div[aria-label="radioButton"])').first();
      if ((await addressRow.count()) > 0) {
        console.log('  Selecting Flat address...');
        await addressRow.click();
        await page.waitForTimeout(1000);
      }

      // Click "Proceed"
      const proceedBtn = page.locator('button[aria-label="Proceed"]');
      if ((await proceedBtn.count()) > 0) {
        console.log('  Clicking Proceed...');
        await proceedBtn.click();
        // After Proceed, the slot checker modal auto-opens
        await page.waitForTimeout(6000);
      }
      await screenshot(page, '05c-after-address');
    } else {
      // Address already set, need to click "Select time & date"
      console.log('Step 6: Address already set, clicking Select time & date...');
      const selectTimeBtn = page.locator('button[aria-label="Select time & date"]');
      if ((await selectTimeBtn.count()) > 0) {
        await selectTimeBtn.click();
        await page.waitForTimeout(5000);
      }
      await screenshot(page, '06-slots');
    }

    // Step 7: Check for "Professionals unavailable"
    console.log('Step 7: Checking availability...');
    const unavailable = await page.locator('h4:has-text("Professionals unavailable")').count();
    const notifyBtn = await page.locator('button[aria-label="Notify when slots are available"]').count();
    const busyText = await page.locator('text=All our professionals for this location are busy').count();

    if (unavailable > 0 || notifyBtn > 0 || busyText > 0) {
      console.log('  Result: Professionals unavailable');
      writeResult({ status: 'unavailable', message: 'Professionals are still unavailable.' });
      return;
    }

    // Check for time slots
    console.log('  No unavailability message found! Checking times...');
    const bodyText = await page.textContent('body');
    const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
    const allTimes = [...new Set(bodyText.match(timePattern) || [])];

    if (allTimes.length > 0) {
      console.log('  SLOTS FOUND: ' + allTimes.join(', '));
      writeResult({
        status: 'available',
        message: 'InstaHelp slots available! Times found: ' + allTimes.join(', '),
        slots: allTimes,
        url: page.url(),
      });
      return;
    }

    await screenshot(page, '07-final');
    writeResult({
      status: 'unknown',
      message: 'Could not determine slot availability. Check screenshot artifacts.',
    });

  } catch (error) {
    console.error('Error:', error.message);
    await screenshot(page, 'error');
    writeResult({ status: 'error', message: 'Check failed: ' + error.message });
  } finally {
    await browser.close();
  }
}

main();

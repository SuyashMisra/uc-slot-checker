/**
 * Login script - run LOCALLY on your machine.
 * Opens your REAL Chrome browser so you can log in manually.
 * Uses channel: 'chrome' to avoid Cloudflare Turnstile detection.
 *
 * Usage: npm run login
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

async function main() {
  const authDir = path.join(__dirname, '..', 'auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);
  const sessionPath = path.join(authDir, 'session.json');

  console.log('\nOpening your Chrome browser for Urban Company login...');
  console.log('Please log in manually in the browser window that opens.');
  console.log('  1. Click the profile icon / Login button');
  console.log('  2. Enter your phone number');
  console.log('  3. Complete the Cloudflare captcha');
  console.log('  4. Enter the OTP you receive');
  console.log('  5. Once logged in, come back here and press ENTER\n');

  // Use a temp profile dir so it doesn't conflict with your running Chrome
  const tempProfileDir = path.join(os.tmpdir(), 'uc-slot-checker-profile');

  // Launch using system Chrome (not Playwright's Chromium) to bypass Cloudflare
  const context = await chromium.launchPersistentContext(tempProfileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.urbancompany.com');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('Press ENTER after you have logged in successfully... ', resolve);
  });
  rl.close();

  // Save session state (cookies + localStorage)
  const state = await context.storageState();
  fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2));

  console.log('\nSession saved to ' + sessionPath);
  console.log('\nNext steps - set this as a GitHub Secret:');
  console.log('  Option A (GitHub CLI):');
  console.log('    gh secret set UC_SESSION < auth/session.json -R SuyashMisra/uc-slot-checker');
  console.log('  Option B (Manual):');
  console.log('    1. Copy the contents of auth/session.json');
  console.log('    2. Go to https://github.com/SuyashMisra/uc-slot-checker/settings/secrets/actions/new');
  console.log('    3. Name: UC_SESSION  |  Value: paste the file contents\n');

  await context.close();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });

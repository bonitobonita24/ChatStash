#!/usr/bin/env node
// Quick browser smoke test — checks landing page, auth, and console errors
// Usage: node scripts/browser-test.mjs [url]

import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:4287';

const errors = [];
const logs = [];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => errors.push(err.message));

  console.log(`\n🔍 Testing ${URL}\n`);

  // 1. Load page
  await page.goto(URL, { waitUntil: 'networkidle' });
  console.log('✓ Page loaded');

  // 2. Check for JS errors
  if (errors.length) {
    console.log(`✗ ${errors.length} JS error(s):`);
    errors.forEach((e) => console.log(`  → ${e}`));
  } else {
    console.log('✓ No JS errors');
  }

  // 3. Check landing page is visible
  const landing = await page.$('#landingPage');
  const landingVisible = landing && await landing.isVisible();
  console.log(landingVisible ? '✓ Landing page visible' : '✗ Landing page NOT visible');

  // 4. Check hero content
  const heroText = await page.textContent('.landing-hero h2').catch(() => null);
  console.log(heroText ? `✓ Hero text: "${heroText.trim().slice(0, 50)}..."` : '✗ Hero text missing');

  // 5. Check feature cards
  const featureCount = await page.$$eval('.feature-card', (els) => els.length).catch(() => 0);
  console.log(featureCount > 0 ? `✓ ${featureCount} feature cards` : '✗ No feature cards');

  // 6. Check layout is hidden
  const layout = await page.$('.layout');
  const layoutHidden = layout && !(await layout.isVisible());
  console.log(layoutHidden ? '✓ Dashboard layout hidden (correct)' : '✗ Dashboard layout visible (wrong)');

  // 7. Check Sign In button works
  const signInBtn = await page.$('#headerSignInBtn');
  if (signInBtn && await signInBtn.isVisible()) {
    await signInBtn.click();
    await page.waitForTimeout(300);
    const loginOverlay = await page.$('#loginOverlay');
    const loginVisible = loginOverlay && await loginOverlay.isVisible();
    console.log(loginVisible ? '✓ Sign In button opens login overlay' : '✗ Sign In button did NOT open login overlay');

    // 8. Check close button works
    const closeBtn = await page.$('#loginOverlay [data-close-overlay]');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      const loginHidden = !(await loginOverlay.isVisible());
      console.log(loginHidden ? '✓ Close button hides login overlay' : '✗ Close button did NOT hide overlay');
    }
  } else {
    console.log('✗ Sign In button not found or not visible');
  }

  // 9. Check Get Started button
  const getStartedBtn = await page.$('#heroGetStartedBtn');
  if (getStartedBtn && await getStartedBtn.isVisible()) {
    await getStartedBtn.click();
    await page.waitForTimeout(300);
    const registerOverlay = await page.$('#registerOverlay');
    const registerVisible = registerOverlay && await registerOverlay.isVisible();
    console.log(registerVisible ? '✓ Get Started opens register overlay' : '✗ Get Started did NOT open register overlay');
  }

  // 10. Check health endpoint
  const health = await page.goto(`${URL}/health`);
  const healthBody = await health.json();
  console.log(healthBody.ok ? '✓ Health endpoint OK' : '✗ Health endpoint failed');

  await browser.close();

  console.log(`\n${errors.length === 0 ? '✅ All checks passed' : `⚠️  ${errors.length} error(s) found`}\n`);
  process.exit(errors.length > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});

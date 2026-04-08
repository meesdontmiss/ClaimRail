import puppeteer from 'puppeteer';

async function debugProduction() {
  console.log('🔍 Testing PRODUCTION Spotify Sign-In...\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 200,
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type().substring(0,4).padEnd(4)} ${msg.text().substring(0,100)}`);
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('auth') || url.includes('spotify')) {
      console.log(`[RESP] ${response.status()} ${url.substring(0,80)}`);
    }
  });

  try {
    console.log('📍 Step 1: Go to production /connect...');
    await page.goto('https://claim-rail.vercel.app/connect', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'debug-prod-01-connect.png', fullPage: true });
    console.log('✅ Screenshot saved: debug-prod-01-connect.png\n');

    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        disabled: b.disabled,
      })),
    }));
    console.log('📋 Page state:', JSON.stringify(info, null, 2), '\n');

    console.log('📍 Step 2: Test CSRF endpoint...');
    const csrfResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/csrf');
        const data = await res.json();
        return {
          status: res.status,
          ok: res.ok,
          hasToken: !!data.csrfToken,
        };
      } catch (err) {
        return { error: err.message };
      }
    });
    console.log('🔑 CSRF Result:', csrfResult, '\n');

    if (csrfResult.ok && csrfResult.hasToken) {
      console.log('📍 Step 3: Find and click sign-in button...');
      
      // Use JavaScript to click the button directly
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const signInBtn = buttons.find(b => 
          b.textContent?.includes('Sign in') && 
          !b.disabled &&
          !b.textContent?.includes('Import')
        );
        
        if (signInBtn) {
          signInBtn.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('✅ Clicked sign-in button via JavaScript\n');
        
        // Wait for navigation
        await new Promise(r => setTimeout(r, 5000));
        
        const currentUrl = page.url();
        console.log(`🌐 Current URL: ${currentUrl}\n`);
        
        await page.screenshot({ path: 'debug-prod-02-after-click.png', fullPage: true });
        console.log('✅ Screenshot saved: debug-prod-02-after-click.png\n');

        if (currentUrl.includes('accounts.spotify.com')) {
          console.log('🎉 SUCCESS! Redirected to Spotify!');
          console.log('✅ Auth flow is working correctly\n');
        } else if (currentUrl.includes('/api/auth/signin/spotify')) {
          console.log('⚠️  On signin endpoint but not redirecting to Spotify');
          console.log('This might mean Spotify OAuth config is wrong\n');
        } else {
          console.log('❌ Still on same page - signin did not work');
          console.log('Check console logs above for errors\n');
        }
      } else {
        console.log('❌ No sign-in button found!');
        console.log('Available buttons:', info.buttons, '\n');
      }
    } else {
      console.log('❌ CSRF endpoint failed - this breaks the entire auth flow!\n');
    }

    console.log('📊 DIAGNOSIS COMPLETE\n');
    console.log('Check the screenshots for visual confirmation.');
    console.log('Key things to verify:');
    console.log('1. Is /connect page rendering?');
    console.log('2. Is /api/auth/csrf returning a token?');
    console.log('3. Does clicking signin redirect to Spotify?');
    console.log('4. Are there any console errors?');

  } catch (err) {
    console.error('❌ Script error:', err.message);
    await page.screenshot({ path: 'debug-prod-error.png' });
  } finally {
    await browser.close();
  }
}

debugProduction().catch(console.error);

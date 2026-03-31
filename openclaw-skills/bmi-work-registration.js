/**
 * OpenCLAW Skill: BMI Work Registration
 * 
 * Automatically logs into BMI.com and registers musical works
 * Save this file to: ~/.openclaw/skills/bmi-work-registration.js
 */

module.exports = {
  name: 'bmi-work-registration',
  version: '1.0.0',
  description: 'Automatically register musical works with BMI',
  author: 'ClaimRail',
  
  // Trigger phrases
  triggers: [
    /register.*bmi/i,
    /bmi.*registration/i,
    /submit.*work.*bmi/i,
  ],
  
  // Required parameters
  parameters: {
    workTitle: { type: 'string', required: true },
    isrc: { type: 'string', required: false },
    writers: { type: 'array', required: true },
    credentials: { type: 'object', required: true },
  },
  
  // Main execution function
  async execute(context, params) {
    const { workTitle, isrc, writers, credentials } = params;
    
    try {
      // Step 1: Navigate to BMI login
      log('Navigating to BMI.com...');
      await browser.goto('https://www.bmi.com/login', { waitUntil: 'networkidle0' });
      await sleep(2000);
      
      // Step 2: Login with credentials from vault
      log('Logging into BMI...');
      await browser.fill('input[name="username"]', await vault.decrypt(credentials.encryptedUsername));
      await browser.fill('input[name="password"]', await vault.decrypt(credentials.encryptedPassword));
      await browser.click('button[type="submit"]');
      
      // Wait for successful login
      await browser.waitForSelector('.dashboard-welcome', { timeout: 10000 });
      log('Login successful!');
      await sleep(1000);
      
      // Step 3: Navigate to work registration
      log('Navigating to work registration...');
      await browser.goto('https://www.bmi.com/register-work', { waitUntil: 'networkidle0' });
      await sleep(1500);
      
      // Step 4: Fill work title
      log('Filling work title...');
      await browser.fill('#work-title', workTitle);
      await sleep(500);
      
      // Step 5: Fill ISRC if provided
      if (isrc) {
        log('Filling ISRC...');
        await browser.fill('#isrc-code', isrc);
        await sleep(500);
      }
      
      // Step 6: Add writers and their shares
      log('Adding writers...');
      for (const writer of writers) {
        // Click "Add Writer" button
        await browser.click('button.add-writer');
        await sleep(500);
        
        // Fill writer name
        await browser.fill('.writer-name-input', writer.name);
        await sleep(300);
        
        // Fill IPI if provided
        if (writer.ipi) {
          await browser.fill('.writer-ipi-input', writer.ipi);
          await sleep(300);
        }
        
        // Fill PRO if provided
        if (writer.pro) {
          await browser.select('.writer-pro-select', writer.pro);
          await sleep(300);
        }
        
        // Fill share percentage
        await browser.fill('.writer-share-input', writer.share.toString());
        await sleep(300);
        
        // Select role
        const roleMap = {
          writer: 'Writer',
          composer: 'Composer',
          publisher: 'Publisher',
        };
        await browser.select('.writer-role-select', roleMap[writer.role]);
        await sleep(500);
      }
      
      // Step 7: Verify total shares = 100%
      log('Verifying share percentages...');
      const totalShares = writers.reduce((sum, w) => sum + w.share, 0);
      if (Math.abs(totalShares - 100) > 0.01) {
        throw new Error(`Writer shares must total 100%, got ${totalShares}%`);
      }
      
      // Step 8: Submit the form
      log('Submitting registration...');
      await browser.click('button[type="submit"]');
      
      // Step 9: Wait for confirmation
      log('Waiting for confirmation...');
      await browser.waitForSelector('.confirmation-message', { timeout: 15000 });
      await sleep(2000);
      
      // Step 10: Extract confirmation number
      const confirmationNumber = await browser.getText('.confirmation-number');
      const workId = await browser.getText('.work-id');
      
      log(`✅ Successfully registered! Confirmation: ${confirmationNumber}`);
      
      // Step 11: Take screenshot for records
      const screenshot = await browser.screenshot();
      await storage.save(`bmi-registration-${Date.now()}.png`, screenshot);
      
      // Step 12: Logout
      log('Logging out...');
      await browser.goto('https://www.bmi.com/logout');
      await sleep(1000);
      
      return {
        success: true,
        confirmationNumber: confirmationNumber.trim(),
        workId: workId?.trim(),
        screenshot: `bmi-registration-${Date.now()}.png`,
      };
      
    } catch (error) {
      log(`❌ Error: ${error.message}`);
      
      // Take screenshot of error
      try {
        const errorScreenshot = await browser.screenshot();
        await storage.save(`bmi-error-${Date.now()}.png`, errorScreenshot);
      } catch {}
      
      // Try to logout
      try {
        await browser.goto('https://www.bmi.com/logout');
      } catch {}
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// Helper functions
function log(message) {
  console.log(`[BMI-Registration] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

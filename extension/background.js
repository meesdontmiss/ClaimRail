/**
 * ClaimRail Extension Background Service Worker
 * 
 * Handles:
 * - License key verification (paywall)
 * - Subscription status checks
 * - Message passing between content script and popup
 * - BMI form auto-fill logic
 */

const CLAIMRAIL_API = 'https://claimrail.com';

// Check license on extension load
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ClaimRail extension installed');
  await verifyLicenseKey();
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'VERIFY_LICENSE':
      const status = await verifyLicenseKey();
      sendResponse(status);
      break;

    case 'SAVE_LICENSE_KEY':
      const result = await saveLicenseKey(message.key);
      sendResponse(result);
      break;

    case 'FILL_BMI_FORM':
      const fillResult = await fillBMIForm(message.data);
      sendResponse(fillResult);
      break;

    case 'GET_SONG_DATA':
      const songData = await getSongDataFromClaimRail();
      sendResponse(songData);
      break;

    case 'TRACK_REGISTRATION':
      const trackResult = await trackRegistration();
      sendResponse(trackResult);
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Verify user's license key and subscription status
 */
async function verifyLicenseKey() {
  try {
    // Get stored license key
    const { licenseKey } = await chrome.storage.local.get('licenseKey');
    
    if (!licenseKey) {
      return {
        valid: false,
        tier: 'none',
        message: 'No license key found',
        requiresLogin: true,
        requiresLicense: true,
      };
    }

    // Verify with ClaimRail API
    const response = await fetch(`${CLAIMRAIL_API}/api/extension/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licenseKey }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          valid: false,
          tier: 'none',
          message: 'Invalid license key',
          requiresLogin: true,
          requiresLicense: true,
        };
      }
      
      throw new Error('Verification failed');
    }

    const data = await response.json();
    
    return {
      valid: data.valid,
      tier: data.tier,
      weeklyLimit: data.weeklyLimit || 1,
      registrationsThisWeek: data.registrationsThisWeek || 0,
      canRegister: data.canRegister,
      message: data.message,
      email: data.email,
    };
  } catch (error) {
    console.error('License verification failed:', error);
    return {
      valid: false,
      tier: 'none',
      message: 'Could not verify license',
      error: error.message,
    };
  }
}

/**
 * Save license key to storage
 */
async function saveLicenseKey(key) {
  try {
    await chrome.storage.local.set({ licenseKey: key });
    
    // Verify the key works
    const verification = await verifyLicenseKey();
    
    return {
      success: verification.valid,
      tier: verification.tier,
      message: verification.message,
    };
  } catch (error) {
    console.error('Save license key error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Fill BMI work registration form with song data
 */
async function fillBMIForm(songData) {
  try {
    // Send message to content script to fill the form
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_BMI_FORM',
      data: songData,
    });

    return response;
  } catch (error) {
    console.error('Failed to fill BMI form:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get song data from ClaimRail API
 */
async function getSongDataFromClaimRail() {
  try {
    const { licenseKey } = await chrome.storage.local.get('licenseKey');
    
    if (!licenseKey) {
      throw new Error('No license key');
    }

    const response = await fetch(`${CLAIMRAIL_API}/api/extension/song-data`, {
      headers: {
        'Authorization': `Bearer ${licenseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch song data');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get song data:', error);
    return { error: error.message };
  }
}

/**
 * Track registration for weekly limit (free tier)
 */
async function trackRegistration() {
  const { licenseKey } = await chrome.storage.local.get('licenseKey');
  
  if (!licenseKey) return { error: 'No license key' };

  const response = await fetch(`${CLAIMRAIL_API}/api/extension/track-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ licenseKey }),
  });

  return await response.json();
}

// Listen for BMI page visits (for auto-fill feature)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url?.includes('bmi.com/register-work') && changeInfo.status === 'complete') {
    console.log('ClaimRail: BMI registration page detected');
    
    // Check if auto-fill is enabled
    const { autoFillEnabled } = await chrome.storage.local.get('autoFillEnabled');
    
    if (autoFillEnabled) {
      // Verify license before auto-filling
      const licenseStatus = await verifyLicenseKey();
      
      if (!licenseStatus.valid || !licenseStatus.canRegister) {
        console.log('ClaimRail: Cannot auto-fill - license invalid or limit reached');
        return;
      }
      
      // Get pending song data
      const songData = await getSongDataFromClaimRail();
      
      if (songData && !songData.error && songData.songs?.length > 0) {
        // Auto-fill the form with first pending song
        await chrome.tabs.sendMessage(tabId, {
          type: 'FILL_BMI_FORM',
          data: songData.songs[0],
        });
      }
    }
  }
});

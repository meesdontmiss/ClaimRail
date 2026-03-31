/**
 * ClaimRail Extension Background Service Worker
 * 
 * Handles:
 * - Subscription verification
 * - Message passing between content script and popup
 * - BMI form auto-fill logic
 */

const CLAIMRAIL_API = 'https://claimrail.com/api';

// Check subscription status on extension load
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ClaimRail extension installed');
  await checkSubscriptionStatus();
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'VERIFY_SUBSCRIPTION':
      const status = await checkSubscriptionStatus();
      sendResponse(status);
      break;

    case 'FILL_BMI_FORM':
      const result = await fillBMIFORM(message.data);
      sendResponse(result);
      break;

    case 'GET_SONG_DATA':
      const songData = await getSongDataFromClaimRail();
      sendResponse(songData);
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Verify user's ClaimRail subscription status
 */
async function checkSubscriptionStatus() {
  try {
    // Get stored API key
    const { apiKey } = await chrome.storage.local.get('apiKey');
    
    if (!apiKey) {
      return {
        valid: false,
        tier: 'none',
        message: 'Please log in to ClaimRail',
        requiresLogin: true,
      };
    }

    // Verify with ClaimRail API
    const response = await fetch(`${CLAIMRAIL_API}/extension/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        valid: false,
        tier: 'none',
        message: 'Invalid API key',
        requiresLogin: true,
      };
    }

    const data = await response.json();
    
    return {
      valid: data.subscription?.active || false,
      tier: data.subscription?.tier || 'free',
      weeklyLimit: data.subscription?.tier === 'pro' ? Infinity : 1,
      registrationsThisWeek: data.registrationsThisWeek || 0,
      canRegister: data.subscription?.tier === 'pro' || (data.registrationsThisWeek < 1),
      message: data.subscription?.tier === 'pro' 
        ? 'Pro plan active - Unlimited registrations!' 
        : 'Free plan - 1 registration per week',
    };
  } catch (error) {
    console.error('Subscription check failed:', error);
    return {
      valid: false,
      tier: 'none',
      message: 'Could not verify subscription',
      error: error.message,
    };
  }
}

/**
 * Fill BMI work registration form with song data
 */
async function fillBMIFORM(songData) {
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
    const { apiKey } = await chrome.storage.local.get('apiKey');
    
    if (!apiKey) {
      throw new Error('Not logged in');
    }

    const response = await fetch(`${CLAIMRAIL_API}/extension/song-data`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
  const { apiKey } = await chrome.storage.local.get('apiKey');
  
  if (!apiKey) return;

  await fetch(`${CLAIMRAIL_API}/extension/track-registration`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
}

// Listen for BMI page visits
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url?.includes('bmi.com/register-work') && changeInfo.status === 'complete') {
    console.log('BMI registration page detected');
    
    // Check if auto-fill is enabled
    const { autoFillEnabled } = await chrome.storage.local.get('autoFillEnabled');
    
    if (autoFillEnabled) {
      // Get pending song data
      const songData = await getSongDataFromClaimRail();
      
      if (songData && !songData.error) {
        // Auto-fill the form
        await chrome.tabs.sendMessage(tabId, {
          type: 'FILL_BMI_FORM',
          data: songData,
        });
      }
    }
  }
});

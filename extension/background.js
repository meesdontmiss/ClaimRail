/**
 * ClaimRail Extension Background Service Worker
 *
 * Handles API-key verification, song retrieval, and BMI form auto-fill.
 */

const CLAIMRAIL_APP_URL = 'https://claim-rail.vercel.app';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('ClaimRail extension installed');
  await verifyLicenseKey();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'VERIFY_LICENSE':
      sendResponse(await verifyLicenseKey());
      break;
    case 'SAVE_LICENSE_KEY':
      sendResponse(await saveLicenseKey(message.key));
      break;
    case 'FILL_BMI_FORM':
      sendResponse(await fillBMIForm(message.data));
      break;
    case 'GET_SONG_DATA':
      sendResponse(await getSongDataFromClaimRail());
      break;
    case 'TRACK_REGISTRATION':
      sendResponse(await trackRegistration(message.recordingId));
      break;
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

async function getStoredLicenseKey() {
  const { licenseKey } = await chrome.storage.local.get('licenseKey');
  return typeof licenseKey === 'string' ? licenseKey.trim() : '';
}

async function verifyLicenseKey() {
  try {
    const licenseKey = await getStoredLicenseKey();

    if (!licenseKey) {
      return {
        valid: false,
        tier: 'none',
        weeklyLimit: 0,
        registrationsThisWeek: 0,
        canRegister: false,
        isUnlimited: false,
        message: 'No API key found',
        requiresLicense: true,
      };
    }

    const response = await fetch(`${CLAIMRAIL_APP_URL}/api/extension/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licenseKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        tier: 'none',
        weeklyLimit: 0,
        registrationsThisWeek: 0,
        canRegister: false,
        isUnlimited: false,
        message: data.message || 'Invalid API key',
        requiresLicense: true,
      };
    }

    return {
      valid: Boolean(data.valid),
      tier: data.tier || 'none',
      weeklyLimit: typeof data.weeklyLimit === 'number' ? data.weeklyLimit : null,
      registrationsThisWeek: typeof data.registrationsThisWeek === 'number' ? data.registrationsThisWeek : 0,
      canRegister: Boolean(data.canRegister),
      isUnlimited: Boolean(data.isUnlimited),
      message: data.message || 'Verification complete',
      email: data.email || null,
    };
  } catch (error) {
    console.error('License verification failed:', error);
    return {
      valid: false,
      tier: 'none',
      weeklyLimit: 0,
      registrationsThisWeek: 0,
      canRegister: false,
      isUnlimited: false,
      message: 'Could not verify API key',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function saveLicenseKey(key) {
  try {
    const trimmedKey = typeof key === 'string' ? key.trim() : '';

    if (!trimmedKey) {
      return {
        success: false,
        error: 'API key is required',
      };
    }

    await chrome.storage.local.set({ licenseKey: trimmedKey });
    const verification = await verifyLicenseKey();

    if (!verification.valid) {
      await chrome.storage.local.remove('licenseKey');
    }

    return {
      success: verification.valid,
      tier: verification.tier,
      message: verification.message,
    };
  } catch (error) {
    console.error('Save license key error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function fillBMIForm(songData) {
  try {
    if (!songData?.id) {
      return {
        success: false,
        error: 'Select a song before trying to fill the BMI form.',
      };
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_BMI_FORM',
      data: songData,
    });

    return response;
  } catch (error) {
    console.error('Failed to fill BMI form:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getSongDataFromClaimRail() {
  try {
    const licenseKey = await getStoredLicenseKey();

    if (!licenseKey) {
      throw new Error('No API key');
    }

    const response = await fetch(`${CLAIMRAIL_APP_URL}/api/extension/song-data`, {
      headers: {
        Authorization: `Bearer ${licenseKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch song data');
    }

    return data;
  } catch (error) {
    console.error('Failed to get song data:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function trackRegistration(recordingId) {
  try {
    const licenseKey = await getStoredLicenseKey();

    if (!licenseKey) {
      return { error: 'No API key' };
    }

    const response = await fetch(`${CLAIMRAIL_APP_URL}/api/extension/track-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${licenseKey}`,
      },
      body: JSON.stringify({ recordingId }),
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to track registration:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url?.includes('bmi.com/register-work') || changeInfo.status !== 'complete') {
    return;
  }

  console.log('ClaimRail: BMI registration page detected');

  const { autoFillEnabled } = await chrome.storage.local.get('autoFillEnabled');

  if (!autoFillEnabled) {
    return;
  }

  const licenseStatus = await verifyLicenseKey();

  if (!licenseStatus.valid || !licenseStatus.canRegister) {
    console.log('ClaimRail: Cannot auto-fill - API key invalid or limit reached');
    return;
  }

  const songData = await getSongDataFromClaimRail();

  if (songData.error || !Array.isArray(songData.songs) || songData.songs.length === 0) {
    return;
  }

  await chrome.tabs.sendMessage(tabId, {
    type: 'FILL_BMI_FORM',
    data: songData.songs[0],
  });
});

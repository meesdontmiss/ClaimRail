/**
 * ClaimRail Extension Popup
 * 
 * Main UI for the extension
 */

const CLAIMRAIL_DASHBOARD = 'https://claimrail.com';
const CLAIMRAIL_API = 'https://claimrail.com/api';

// DOM Elements
const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('content');
const licenseInput = document.getElementById('licenseInput');
const licenseKeyInput = document.getElementById('licenseKeyInput');
const saveLicenseBtn = document.getElementById('saveLicenseBtn');
const statusBadge = document.getElementById('statusBadge');
const statusMessage = document.getElementById('statusMessage');
const usageInfo = document.getElementById('usageInfo');
const usageCount = document.getElementById('usageCount');
const usageFill = document.getElementById('usageFill');
const pendingSongs = document.getElementById('pendingSongs');
const songsList = document.getElementById('songsList');
const fillFormBtn = document.getElementById('fillFormBtn');
const freeTierCTA = document.getElementById('freeTierCTA');
const loginCTA = document.getElementById('loginCTA');
const upgradeBtn = document.getElementById('upgradeBtn');
const loginBtn = document.getElementById('loginBtn');

// Initialize popup
async function init() {
  try {
    // Check if license key exists
    const { licenseKey } = await chrome.storage.local.get('licenseKey');
    
    if (!licenseKey) {
      showLicenseInputScreen();
      return;
    }

    // Verify license
    const license = await verifyLicense();
    
    if (!license.valid) {
      if (license.requiresLicense) {
        showLicenseInputScreen();
      } else {
        showUpgradeScreen();
      }
      return;
    }

    // Show main UI
    showMainUI(license);
    
  } catch (error) {
    console.error('Popup init error:', error);
    showError('Failed to load extension');
  }
}

/**
 * Verify license with ClaimRail API
 */
async function verifyLicense() {
  const response = await chrome.runtime.sendMessage({
    type: 'VERIFY_LICENSE',
  });
  
  return response;
}

/**
 * Show license key input screen
 */
function showLicenseInputScreen() {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  licenseInput.classList.remove('hidden');
  pendingSongs.classList.add('hidden');
  freeTierCTA.classList.add('hidden');
  loginCTA.classList.add('hidden');
}

/**
 * Show main UI based on license tier
 */
function showMainUI(license) {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  licenseInput.classList.add('hidden');
  pendingSongs.classList.add('hidden');
  freeTierCTA.classList.add('hidden');
  loginCTA.classList.add('hidden');

  // Update status badge
  statusBadge.textContent = license.tier === 'pro' ? 'PRO' : 'FREE';
  statusBadge.className = `status-badge ${license.tier}`;
  statusMessage.textContent = license.message;

  // Show usage for free tier
  if (license.tier === 'free') {
    usageInfo.classList.remove('hidden');
    usageCount.textContent = `${license.registrationsThisWeek}/${license.weeklyLimit}`;
    const percentage = (license.registrationsThisWeek / license.weeklyLimit) * 100;
    usageFill.style.width = `${percentage}%`;
    
    if (license.registrationsThisWeek >= license.weeklyLimit) {
      fillFormBtn.disabled = true;
      fillFormBtn.textContent = 'Weekly Limit Reached';
      showUpgradeScreen();
    }
  } else {
    usageInfo.classList.add('hidden');
  }

  // Load pending songs for pro users
  if (license.tier === 'pro') {
    loadPendingSongs();
  }
}

/**
 * Show upgrade screen
 */
function showUpgradeScreen() {
  freeTierCTA.classList.remove('hidden');
  pendingSongs.classList.add('hidden');
}

/**
 * Show error
 */
function showError(message) {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  licenseInput.classList.add('hidden');
  statusBadge.className = 'status-badge none';
  statusBadge.textContent = 'ERROR';
  statusMessage.textContent = message;
}

// Event Listeners
saveLicenseBtn.addEventListener('click', async () => {
  const licenseKey = licenseKeyInput.value.trim();
  
  if (!licenseKey) {
    alert('Please enter a license key');
    return;
  }

  // Save license key
  saveLicenseBtn.disabled = true;
  saveLicenseBtn.textContent = 'Activating...';
  
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_LICENSE_KEY',
    key: licenseKey,
  });
  
  saveLicenseBtn.disabled = false;
  saveLicenseBtn.textContent = 'Activate License';
  
  if (result.success) {
    // Reload popup with new license
    init();
  } else {
    alert('Failed to activate license: ' + result.error);
  }
});

upgradeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${CLAIMRAIL_DASHBOARD}/pricing?upgrade=true` });
});

fillFormBtn.addEventListener('click', async () => {
  // Check if on BMI registration page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url?.includes('bmi.com/register-work')) {
    // Open BMI registration page
    chrome.tabs.create({ url: 'https://www.bmi.com/register-work' });
    return;
  }

  // Fill form on current page
  const result = await chrome.runtime.sendMessage({
    type: 'FILL_BMI_FORM',
  });

  if (result.success) {
    // Track registration for free tier limit
    await chrome.runtime.sendMessage({ type: 'TRACK_REGISTRATION' });
    
    // Close popup
    window.close();
  } else {
    alert('Failed to fill form: ' + result.error);
  }
});

// Load pending songs from ClaimRail
async function loadPendingSongs() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SONG_DATA',
    });

    if (response.error || !response.songs || response.songs.length === 0) {
      pendingSongs.classList.add('hidden');
      return;
    }

    pendingSongs.classList.remove('hidden');
    songsList.innerHTML = '';

    response.songs.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = 'song-card';
      songCard.innerHTML = `
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ISRC: ${song.isrc || 'N/A'} • ${song.writers?.length || 0} writers
        </div>
      `;
      songsList.appendChild(songCard);
    });
  } catch (error) {
    console.error('Failed to load songs:', error);
  }
}

// Initialize on load
init();

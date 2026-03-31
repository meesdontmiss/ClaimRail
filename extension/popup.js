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
    // Check if user is logged in
    const { apiKey } = await chrome.storage.local.get('apiKey');
    
    if (!apiKey) {
      showLoginScreen();
      return;
    }

    // Verify subscription
    const subscription = await verifySubscription();
    
    if (!subscription.valid) {
      if (subscription.requiresLogin) {
        showLoginScreen();
      } else {
        showUpgradeScreen();
      }
      return;
    }

    // Show main UI
    showMainUI(subscription);
    
  } catch (error) {
    console.error('Popup init error:', error);
    showError('Failed to load extension');
  }
}

/**
 * Verify subscription with ClaimRail API
 */
async function verifySubscription() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  
  const response = await chrome.runtime.sendMessage({
    type: 'VERIFY_SUBSCRIPTION',
  });
  
  return response;
}

/**
 * Show main UI based on subscription tier
 */
function showMainUI(subscription) {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  // Update status badge
  statusBadge.textContent = subscription.tier === 'pro' ? 'PRO' : 'FREE';
  statusBadge.className = `status-badge ${subscription.tier}`;
  statusMessage.textContent = subscription.message;

  // Show usage for free tier
  if (subscription.tier === 'free') {
    usageInfo.classList.remove('hidden');
    usageCount.textContent = `${subscription.registrationsThisWeek}/${subscription.weeklyLimit}`;
    const percentage = (subscription.registrationsThisWeek / subscription.weeklyLimit) * 100;
    usageFill.style.width = `${percentage}%`;
    
    if (subscription.registrationsThisWeek >= subscription.weeklyLimit) {
      fillFormBtn.disabled = true;
      fillFormBtn.textContent = 'Weekly Limit Reached';
      showUpgradeScreen();
    }
  }

  // Load pending songs for pro users
  if (subscription.tier === 'pro') {
    loadPendingSongs();
  } else {
    pendingSongs.classList.add('hidden');
  }
}

/**
 * Load pending songs from ClaimRail
 */
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

/**
 * Show login screen
 */
function showLoginScreen() {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  pendingSongs.classList.add('hidden');
  freeTierCTA.classList.add('hidden');
  loginCTA.classList.remove('hidden');
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
  statusBadge.className = 'status-badge none';
  statusBadge.textContent = 'ERROR';
  statusMessage.textContent = message;
}

// Event Listeners
loginBtn.addEventListener('click', () => {
  // Open ClaimRail login in new tab
  chrome.tabs.create({ url: `${CLAIMRAIL_DASHBOARD}/login?extension=true` });
  
  // Listen for auth completion
  chrome.tabs.onUpdated.addListener(function onTabUpdated(tabId, changeInfo, tab) {
    if (tab.url?.includes('claimrail.com/dashboard') && changeInfo.status === 'complete') {
      // User logged in, save API key
      chrome.tabs.sendMessage(tabId, { type: 'GET_API_KEY' }, (response) => {
        if (response?.apiKey) {
          chrome.storage.local.set({ apiKey: response.apiKey });
          init(); // Reload popup
        }
      });
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
    }
  });
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
    // Close popup
    window.close();
  } else {
    alert('Failed to fill form: ' + result.error);
  }
});

// Initialize on load
init();

/**
 * ClaimRail Extension Popup
 */

const CLAIMRAIL_DASHBOARD = 'https://claim-rail.vercel.app';

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
const upgradeBtn = document.getElementById('upgradeBtn');
const loginBtn = document.getElementById('loginBtn');

let selectedSong = null;

function setButtonLoading(button, isLoading, defaultLabel, loadingLabel) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingLabel : defaultLabel;
}

function showBaseLayout() {
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

function hideOptionalPanels() {
  licenseInput.classList.add('hidden');
  pendingSongs.classList.add('hidden');
  freeTierCTA.classList.add('hidden');
  loginCTA.classList.add('hidden');
}

async function init() {
  try {
    const { licenseKey } = await chrome.storage.local.get('licenseKey');

    if (!licenseKey) {
      showLicenseInputScreen();
      return;
    }

    const license = await verifyLicense();

    if (!license.valid) {
      if (license.requiresLicense) {
        showLicenseInputScreen(license.message);
      } else {
        showError(license.message || 'Extension access is unavailable.');
      }
      return;
    }

    await showMainUI(license);
  } catch (error) {
    console.error('Popup init error:', error);
    showError('Failed to load extension.');
  }
}

async function verifyLicense() {
  return chrome.runtime.sendMessage({ type: 'VERIFY_LICENSE' });
}

function showLicenseInputScreen(message) {
  showBaseLayout();
  hideOptionalPanels();
  licenseInput.classList.remove('hidden');
  statusBadge.className = 'status-badge none';
  statusBadge.textContent = 'KEY';
  statusMessage.textContent = message || 'Enter your ClaimRail API key to connect the extension.';
}

async function showMainUI(license) {
  showBaseLayout();
  hideOptionalPanels();

  statusBadge.textContent = license.tier === 'pro' ? 'PRO' : 'FREE';
  statusBadge.className = `status-badge ${license.tier}`;
  statusMessage.textContent = license.message;

  if (license.tier === 'free') {
    usageInfo.classList.remove('hidden');
    usageCount.textContent = `${license.registrationsThisWeek}/${license.weeklyLimit}`;
    const percentage = license.weeklyLimit > 0
      ? Math.min(100, (license.registrationsThisWeek / license.weeklyLimit) * 100)
      : 0;
    usageFill.style.width = `${percentage}%`;
  } else {
    usageInfo.classList.add('hidden');
    usageFill.style.width = '0%';
  }

  if (!license.canRegister) {
    fillFormBtn.disabled = true;
    fillFormBtn.textContent = 'Weekly Limit Reached';
    freeTierCTA.classList.remove('hidden');
    return;
  }

  await loadPendingSongs();
}

function showError(message) {
  showBaseLayout();
  hideOptionalPanels();
  statusBadge.className = 'status-badge none';
  statusBadge.textContent = 'ERROR';
  statusMessage.textContent = message;
}

function createSongMeta(text) {
  const meta = document.createElement('div');
  meta.style.fontSize = '11px';
  meta.style.color = '#666';
  meta.style.marginTop = '4px';
  meta.textContent = text;
  return meta;
}

function renderSongs(songs) {
  selectedSong = songs[0] || null;
  songsList.replaceChildren();

  songs.forEach((song) => {
    const songCard = document.createElement('button');
    songCard.type = 'button';
    songCard.className = 'song-card song-card-button';
    songCard.dataset.songId = song.id;

    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = song.title;

    const artist = document.createElement('div');
    artist.className = 'song-artist';
    artist.textContent = song.artist;

    const meta = createSongMeta(
      `ISRC: ${song.isrc || 'N/A'} | ${Array.isArray(song.writers) ? song.writers.length : 0} writers`
    );

    songCard.append(title, artist, meta);
    songCard.addEventListener('click', () => {
      selectedSong = song;
      updateSelectedSongStyles();
    });

    songsList.appendChild(songCard);
  });

  updateSelectedSongStyles();
}

function updateSelectedSongStyles() {
  const cards = songsList.querySelectorAll('.song-card-button');

  cards.forEach((card) => {
    const isSelected = card.dataset.songId === selectedSong?.id;
    card.classList.toggle('song-card-selected', isSelected);
  });

  fillFormBtn.disabled = !selectedSong;
  fillFormBtn.textContent = selectedSong ? 'Auto-Fill BMI Form' : 'No Song Available';
}

async function loadPendingSongs() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SONG_DATA' });

    if (response.error) {
      pendingSongs.classList.add('hidden');
      freeTierCTA.classList.remove('hidden');
      statusMessage.textContent = response.error;
      return;
    }

    if (!Array.isArray(response.songs) || response.songs.length === 0) {
      pendingSongs.classList.add('hidden');
      statusMessage.textContent = 'No pending songs are ready for BMI registration yet.';
      return;
    }

    pendingSongs.classList.remove('hidden');
    renderSongs(response.songs);
  } catch (error) {
    console.error('Failed to load songs:', error);
    statusMessage.textContent = 'Failed to load songs.';
  }
}

saveLicenseBtn.addEventListener('click', async () => {
  const licenseKey = licenseKeyInput.value.trim();

  if (!licenseKey) {
    alert('Please enter an API key.');
    return;
  }

  setButtonLoading(saveLicenseBtn, true, 'Activate Key', 'Activating...');
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_LICENSE_KEY',
    key: licenseKey,
  });
  setButtonLoading(saveLicenseBtn, false, 'Activate Key', 'Activating...');

  if (result.success) {
    await init();
    return;
  }

  alert(`Failed to activate key: ${result.error || result.message || 'Unknown error'}`);
});

upgradeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${CLAIMRAIL_DASHBOARD}/pricing?upgrade=true` });
});

loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${CLAIMRAIL_DASHBOARD}/dashboard/settings` });
});

fillFormBtn.addEventListener('click', async () => {
  if (!selectedSong) {
    alert('Select a song first.');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes('bmi.com/register-work')) {
    chrome.tabs.create({ url: 'https://www.bmi.com/register-work' });
    return;
  }

  const result = await chrome.runtime.sendMessage({
    type: 'FILL_BMI_FORM',
    data: selectedSong,
  });

  if (!result.success) {
    alert(`Failed to fill form: ${result.error}`);
    return;
  }

  const trackingResult = await chrome.runtime.sendMessage({
    type: 'TRACK_REGISTRATION',
    recordingId: selectedSong.id,
  });

  if (trackingResult.error && trackingResult.upgradeRequired) {
    showError(trackingResult.error);
    freeTierCTA.classList.remove('hidden');
    return;
  }

  window.close();
});

init();

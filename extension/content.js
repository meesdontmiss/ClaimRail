/**
 * ClaimRail Extension Content Script
 *
 * Injected into BMI pages to auto-fill work registration forms.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'FILL_BMI_FORM') {
    return false;
  }

  fillBMIForm(message.data)
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ success: false, error: error.message }));

  return true;
});

async function fillBMIForm(songData) {
  try {
    if (!songData?.title) {
      throw new Error('No song data was provided.');
    }

    console.log('ClaimRail: Filling BMI form for', songData.title);

    await waitForElement('#work-title', 5000);

    setInputValue('#work-title', songData.title);

    if (songData.isrc) {
      setInputValue('#isrc-code', songData.isrc);
    }

    if (Array.isArray(songData.writers) && songData.writers.length > 0) {
      for (const writer of songData.writers) {
        const addWriterButton = document.querySelector('button.add-writer');

        if (addWriterButton) {
          addWriterButton.click();
          await sleep(500);
        }

        setInputValue('.writer-name-input', writer.name);

        if (writer.ipi) {
          setInputValue('.writer-ipi-input', writer.ipi);
        }

        if (writer.pro) {
          setSelectValue('.writer-pro-select', writer.pro);
        }

        if (writer.share != null) {
          setInputValue('.writer-share-input', String(writer.share));
        }

        if (writer.role) {
          const roleMap = {
            writer: 'Writer',
            composer: 'Composer',
            lyricist: 'Writer',
            composer_lyricist: 'Writer',
            arranger: 'Composer',
            publisher: 'Publisher',
          };

          setSelectValue('.writer-role-select', roleMap[writer.role] || 'Writer');
        }

        await sleep(300);
      }
    }

    showNotification('ClaimRail: Form filled. Review it, then click Submit.', 'success');

    return {
      success: true,
      message: 'Form filled successfully. Please review it before submitting.',
      filledFields: {
        title: Boolean(songData.title),
        isrc: Boolean(songData.isrc),
        writers: Array.isArray(songData.writers) ? songData.writers.length : 0,
      },
    };
  } catch (error) {
    console.error('ClaimRail: Failed to fill form:', error);
    showNotification(`ClaimRail: Failed to fill form - ${error.message}`, 'error');

    return {
      success: false,
      error: error.message,
    };
  }
}

function setInputValue(selector, value) {
  const input = document.querySelector(selector);

  if (!input) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setSelectValue(selector, value) {
  const select = document.querySelector(selector);

  if (!select) {
    return;
  }

  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const existingElement = document.querySelector(selector);

    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const observer = new MutationObserver(() => {
      const nextElement = document.querySelector(selector);

      if (nextElement) {
        observer.disconnect();
        resolve(nextElement);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('ClaimRail extension loaded on BMI.com');

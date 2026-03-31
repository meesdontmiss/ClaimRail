/**
 * ClaimRail Extension Content Script
 * 
 * Injected into BMI.com pages to auto-fill registration forms
 */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILL_BMI_FORM') {
    fillBMIForm(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Fill BMI work registration form
 */
async function fillBMIForm(songData) {
  try {
    console.log('ClaimRail: Filling BMI form with data:', songData);

    // Wait for form to be fully loaded
    await waitForElement('#work-title', 5000);

    // Fill work title
    const titleInput = document.querySelector('#work-title');
    if (titleInput && songData.title) {
      titleInput.value = songData.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✓ Filled title:', songData.title);
    }

    // Fill ISRC if provided
    if (songData.isrc) {
      const isrcInput = document.querySelector('#isrc-code');
      if (isrcInput) {
        isrcInput.value = songData.isrc;
        isrcInput.dispatchEvent(new Event('input', { bubbles: true }));
        isrcInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✓ Filled ISRC:', songData.isrc);
      }
    }

    // Fill writers
    if (songData.writers && songData.writers.length > 0) {
      console.log('Adding writers:', songData.writers.length);
      
      for (const writer of songData.writers) {
        // Click "Add Writer" button
        const addWriterBtn = document.querySelector('button.add-writer');
        if (addWriterBtn) {
          addWriterBtn.click();
          await sleep(500);
        }

        // Find the newly added writer fields
        const writerNameInput = document.querySelector('.writer-name-input');
        const writerShareInput = document.querySelector('.writer-share-input');
        const writerIpiInput = document.querySelector('.writer-ipi-input');
        const writerProSelect = document.querySelector('.writer-pro-select');
        const writerRoleSelect = document.querySelector('.writer-role-select');

        if (writerNameInput && writer.name) {
          writerNameInput.value = writer.name;
          writerNameInput.dispatchEvent(new Event('input', { bubbles: true }));
          writerNameInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✓ Added writer:', writer.name);
        }

        if (writerShareInput && writer.share) {
          writerShareInput.value = writer.share.toString();
          writerShareInput.dispatchEvent(new Event('input', { bubbles: true }));
          writerShareInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✓ Set share:', writer.share + '%');
        }

        if (writerIpiInput && writer.ipi) {
          writerIpiInput.value = writer.ipi;
          writerIpiInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('✓ Added IPI:', writer.ipi);
        }

        if (writerProSelect && writer.pro) {
          writerProSelect.value = writer.pro;
          writerProSelect.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✓ Set PRO:', writer.pro);
        }

        if (writerRoleSelect && writer.role) {
          const roleMap = {
            writer: 'Writer',
            composer: 'Composer',
            publisher: 'Publisher',
          };
          writerRoleSelect.value = roleMap[writer.role];
          writerRoleSelect.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✓ Set role:', writer.role);
        }

        await sleep(300);
      }
    }

    // Show success message
    showNotification('✅ ClaimRail: Form filled! Review and click Submit', 'success');

    return {
      success: true,
      message: 'Form filled successfully! Please review and submit.',
      filledFields: {
        title: !!songData.title,
        isrc: !!songData.isrc,
        writers: songData.writers?.length || 0,
      },
    };
  } catch (error) {
    console.error('ClaimRail: Failed to fill form:', error);
    showNotification('❌ ClaimRail: Failed to fill form - ' + error.message, 'error');
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Show notification to user
 */
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

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Wait for element to appear in DOM
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add CSS animations for notifications
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

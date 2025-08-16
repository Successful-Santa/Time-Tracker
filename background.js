// Website Time Tracker background script
// Tracks time spent on each domain

let activeTabId = null;
let activeDomain = null;
let lastActivated = Date.now();

// Helper to get domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Save time spent to storage
function saveTime(domain, ms) {
  if (!domain) return;
  chrome.storage.local.get([domain], (result) => {
    const prev = result[domain] || 0;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${domain}_${today}`;
    chrome.storage.local.get([key], (res) => {
      const prevToday = res[key] || 0;
      chrome.storage.local.set({ [key]: prevToday + ms });
    });
  });
}

function handleTabChange(tabId, url) {
  const now = Date.now();
  if (activeDomain && activeTabId !== null) {
    const timeSpent = now - lastActivated;
    saveTime(activeDomain, timeSpent);
  }
  activeTabId = tabId;
  activeDomain = getDomain(url);
  lastActivated = now;
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      handleTabChange(tabId, tab.url);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    handleTabChange(tabId, changeInfo.url);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All windows unfocused
    handleTabChange(null, null);
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        handleTabChange(tabs[0].id, tabs[0].url);
      }
    });
  }
});

// On suspend, save time
chrome.runtime.onSuspend.addListener(() => {
  handleTabChange(null, null);
});

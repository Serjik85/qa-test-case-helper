// Handle installation and updates
chrome.runtime.onInstalled.addListener(() => {
    // Set default state to enabled
    chrome.storage.local.set({ enabled: true });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')) {
        
        // Check if extension is enabled
        chrome.storage.local.get(['enabled'], function(result) {
            if (result.enabled !== false) {
                // Inject content script if extension is enabled
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }).catch(err => console.error('Failed to inject content script:', err));
            }
        });
    }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStatus') {
        chrome.storage.local.get(['enabled'], function(result) {
            sendResponse({ enabled: result.enabled !== false });
        });
        return true; // Will respond asynchronously
    }
});

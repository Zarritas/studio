// public/background.js
try {
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("TabWise extension installed:", details.reason);
    // Perform any setup tasks here, like setting default values in chrome.storage
    // For example, initializing settings if they don't exist:
    // chrome.storage.local.get(['settings'], (result) => {
    //   if (!result.settings) {
    //     chrome.storage.local.set({
    //       settings: {
    //         geminiApiKey: '',
    //         autoCloseInactiveTabs: false,
    //         inactiveThreshold: 30,
    //         aiPreferences: '',
    //         locale: 'en',
    //         theme: 'system',
    //       }
    //     });
    //   }
    // });

    if (details.reason === 'install') {
      // Open the dashboard on first install.
      // chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  });

  // Listen for messages from other parts of the extension (e.g., popup, options page)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background script:", request, "from sender:", sender);

    if (request.action === "openDashboard") {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      sendResponse({ status: "Dashboard opening" });
      return true; // Keep the message channel open for asynchronous response if needed
    }
    
    // Add more message handlers as needed for your extension's functionality
    // For example, handling API calls or complex logic that shouldn't block the UI.

    // Default response if no specific action matched
    // sendResponse({ status: "Unknown action" }); 
    // return false; // Or true if you plan to sendResponse asynchronously elsewhere
  });

  // Example: If you remove the default_popup from manifest.json,
  // this listener would handle clicks on the extension's toolbar icon.
  // chrome.action.onClicked.addListener((tab) => {
  //   console.log("TabWise icon clicked on tab:", tab.id);
  //   // This could open your main UI or perform a default action.
  //   chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  // });

  console.log("TabWise background service worker started.");

} catch (e) {
  console.error("Error in TabWise background script:", e);
}

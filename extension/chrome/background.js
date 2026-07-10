// Content scripts can't call chrome.runtime.openOptionsPage() directly,
// so relay the request through this service worker.
const browser = chrome;

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "open-options") {
    browser.runtime.openOptionsPage();
  }
});

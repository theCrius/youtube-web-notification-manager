// Content scripts can't call browser.runtime.openOptionsPage() directly,
// so relay the request through this background page.
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "open-options") {
    browser.runtime.openOptionsPage();
  }
});

// Chrome's chrome.* APIs are promise-based for the calls this extension
// uses (storage.local.get/set, runtime.sendMessage, runtime.onMessage,
// runtime.openOptionsPage) since Manifest V3, so a plain alias is enough to
// run the same content.js/settings.js/options.js used by the Firefox
// extension unmodified - no need for the full webextension-polyfill library.
if (typeof browser === "undefined") {
  var browser = chrome;
}

# YouTube Subscriptions Notification Manager (Chrome extension)

Bulk-set notification preferences (All / Personalised / None) for all your
YouTube subscriptions, from a button injected on
`https://www.youtube.com/feed/channels`.

This is currently **local-install only** — it's not published to the Chrome
Web Store, so it has to be loaded as an unpacked extension.

## Install (unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `extension/chrome/` folder.
4. Go to https://www.youtube.com/feed/channels — you should see a
   **🔔 Set notifications…** button next to the sort dropdown ("New activity" /
   "Most relevant" / "A-Z").

Unlike Firefox's temporary add-ons, this stays installed across restarts —
you'll only need to reload it (the ⟳ icon on the extension's card in
`chrome://extensions`) after pulling code changes.

## Usage

Same as the Firefox version — see
[`../firefox/README.md`](../firefox/README.md#usage) for the full walkthrough
(preference picker, dry run, limit, live log, Stop, and the ⚙ Settings page
for advanced tuning).

## How it works

Identical logic to the Firefox extension (`content.js`, `settings.js`,
`options.js` are the same files). The only differences are the manifest
(Chrome's Manifest V3 requires a `service_worker` background instead of
Firefox's `background.scripts`) and a small `browser-polyfill-shim.js` that
aliases `browser` to `chrome`, since Chrome's `chrome.*` APIs are
promise-based for everything this extension uses.

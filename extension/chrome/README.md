# YouTube Subscriptions Notification Manager (Chrome extension)

Bulk-set notification preferences (All / Personalised / None) for all your
YouTube subscriptions, from a button injected on
`https://www.youtube.com/feed/channels`.

This is currently **local-install only** — it's not published to the Chrome
Web Store, so it has to be loaded as an unpacked extension.

## Install (unpacked)

This folder only holds the Chrome-specific `manifest.json` and
`background.js` — the rest of the extension lives in
[`../shared/`](../shared/), since it's identical across browsers. Run the
build script first to assemble a complete, loadable copy:

```sh
node extension/build.js
```

That produces `extension/dist/chrome/` (and `extension/dist/firefox/`).
Re-run it after pulling changes to either `extension/shared/` or
`extension/chrome/`.

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select `extension/dist/chrome/` (not this
   `extension/chrome/` folder — that one is missing the shared files).
4. Go to https://www.youtube.com/feed/channels — you should see a
   **🔔 Set notifications…** button next to the sort dropdown ("New activity" /
   "Most relevant" / "A-Z").

Unlike Firefox's temporary add-ons, this stays installed across restarts —
you'll only need to re-run the build script and reload it (the ⟳ icon on the
extension's card in `chrome://extensions`) after pulling code changes.

## Usage

Same as the Firefox version — see
[`../firefox/README.md`](../firefox/README.md#usage) for the full walkthrough
(preference picker, dry run, limit, live log, Stop, and the ⚙ Settings page
for advanced tuning).

## How it works

Identical logic to the Firefox extension — `content.js`, `settings.js`,
`options.js`, etc. in [`../shared/`](../shared/) are literally the same
files loaded by both. The only real differences are the manifest (Chrome's
Manifest V3 requires a `service_worker` background instead of Firefox's
`background.scripts`) and `background.js` itself. A small
`browser-polyfill-shim.js` (also shared) aliases `browser` to `chrome`,
since Chrome's `chrome.*` APIs are promise-based for everything this
extension uses; it's a no-op on Firefox, where `browser` already exists.

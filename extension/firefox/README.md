# YouTube Subscriptions Notification Manager (Firefox extension)

Bulk-set notification preferences (All / Personalised / None) for all your
YouTube subscriptions, from a button injected on
`https://www.youtube.com/feed/channels`.

This is currently **local-install only** — it's not signed or published to
addons.mozilla.org, so it has to be loaded as a temporary add-on (which lasts
until you close Firefox / reload it).

## Install (temporary add-on)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside this `extension/firefox/` folder.
4. Go to https://www.youtube.com/feed/channels — you should see a
   **🔕 Set notifications…** button next to the sort dropdown ("New activity" /
   "Most relevant" / "A-Z").

You'll need to repeat step 1-3 each time you restart Firefox, since temporary
add-ons don't persist.

## Usage

1. Click **🔕 Set notifications…** to open the panel.
2. Pick the preference to set (All / Personalised / None), whether to run as
   a dry run first (recommended — it opens each menu and confirms it can find
   the option, without clicking it), and optionally a limit on how many
   channels to touch in this run.
3. Click **Run**. Progress is logged live in the panel, and you can click
   **Stop** to cancel partway through.
4. Click the **⚙ Settings** button (or the extension's own Firefox
   preferences page) to configure advanced options: delay ranges between
   actions, how long to wait for the dropdown menu to open, how many empty
   scrolls before giving up on finding more channels, and a debug mode that
   also shows some harmless-but-noisy console errors from YouTube's own code.

Re-running is safe: channels already set to the target preference are
skipped (logged as `[skip] "..." already set to "..."`) without sending a
request for them.

## How it works

Same approach as the console script in the repo root: for each channel row
it clicks the notification bell, waits for the dropdown, and clicks the
target option — driving YouTube's real page UI rather than making raw HTTP
requests, so there's no session/auth token handling involved.

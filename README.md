# youtube-web-notification-manager

A small browser console script to bulk-set all your YouTube subscriptions'
notification preference to "None" (mute), since YouTube has no built-in
"mute all" button.

## Usage

1. Sign in to YouTube and open https://www.youtube.com/feed/channels
2. Let the page finish loading.
3. Open DevTools (F12) → Console tab.
4. Paste the contents of [`scripts/mute-all-subscriptions.js`](scripts/mute-all-subscriptions.js) and press Enter.
5. Watch the console output. It logs each channel as it's muted (`[muted] ...`),
   and warns/errors if something couldn't be found for a particular channel.
6. It auto-scrolls to pick up channels that load lazily, and stops once a few
   scrolls in a row find nothing new.

Re-running the script is safe — muting an already-muted channel is a no-op.

## How it works

The script drives the real page UI: for each channel row it clicks the
notification bell button, waits for the dropdown (All / Personalised / None /
Unsubscribe) to open, and clicks "None". It does not make raw HTTP requests
or touch cookies/auth tokens directly — YouTube's own frontend code handles
that when the button is clicked, so there's nothing to reverse-engineer and
no credentials are ever exposed. Small randomized delays are used between
actions.

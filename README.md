# youtube-web-notification-manager

A small browser console script to bulk-set all your YouTube subscriptions to
the same notification preference (All / Personalised / None), since YouTube
has no built-in way to do this for more than one channel at a time.

## Usage

1. Sign in to YouTube and open https://www.youtube.com/feed/channels
2. Let the page finish loading.
3. Open DevTools (F12) → Console tab.
4. Paste the contents of [`scripts/mute-all-subscriptions.js`](scripts/mute-all-subscriptions.js) and press Enter.
5. Watch the console output. It logs each channel as it's set (`[set] "..." -> "..."`),
   and warns/errors if something couldn't be found for a particular channel.
6. It auto-scrolls to pick up channels that load lazily, and stops once a few
   scrolls in a row find nothing new.

Re-running the script is safe — reselecting a channel's current preference is a no-op.

### Choosing the preference

At the top of the script, `TARGET_PREFERENCE` controls what every channel
gets set to — one of `'All'`, `'Personalised'`, or `'None'` (default: `'None'`,
i.e. mute).

### Test before applying

The script starts in dry-run mode by default (`DRY_RUN = true` near the top,
with `LIMIT = 5` so it only touches the first 5 channels). In this mode it
opens each channel's notification menu, confirms it can find the
`TARGET_PREFERENCE` option, logs `[dry-run] would set "..." to "..."`, and
closes the menu without clicking anything — nothing on your account changes.

1. Paste the script as-is and run it first. Check the console: every channel
   should get a `[dry-run]` line, with no `[fail]`/`[error]` lines.
2. If that looks right, edit the constants at the top of the script before
   pasting again:
   - `TARGET_PREFERENCE` to the level you actually want
   - `DRY_RUN = false` to actually apply the change
   - `LIMIT = null` to process all channels instead of just the first 5

### Troubleshooting

YouTube's own UI code throws a harmless but noisy console error in response
to the script's clicks; by default the script filters that specific error out
so the console stays readable. If something isn't working and you want to see
everything (including that noise, in case it's relevant), set `DEBUG = true`
at the top of the script before pasting.

## How it works

The script drives the real page UI: for each channel row it clicks the
notification bell button, waits for the dropdown (All / Personalised / None /
Unsubscribe) to open, and clicks the option matching `TARGET_PREFERENCE`. It
does not make raw HTTP requests or touch cookies/auth tokens directly —
YouTube's own frontend code handles that when the button is clicked, so
there's nothing to reverse-engineer and no credentials are ever exposed.
Small randomized delays are used between actions.

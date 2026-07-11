# youtube-web-notification-manager

Bulk-set all your YouTube subscriptions to the same notification preference
(All / Personalised / None), since YouTube has no built-in way to do this for
more than one channel at a time.

None of these touch cookies, auth tokens, or make raw HTTP requests — they
all drive YouTube's own page UI (open each channel's notification menu,
click the target option), so there's nothing to reverse-engineer and no
credentials are ever exposed.

## Browser extensions (recommended)

An on-page button next to the sort dropdown on `youtube.com/feed/channels`
opens a panel to pick the preference, dry-run/limit the run, watch live
progress, and stop partway through — plus a settings page for advanced
tuning. Currently local-install only (not published to any extension store).

- [`extension/firefox/`](extension/firefox/)
- [`extension/chrome/`](extension/chrome/)

Both share the same code, in [`extension/shared/`](extension/shared/); see
either folder's README for install steps (there's a one-time build step to
assemble a loadable copy — `node extension/build.js`).

## Standalone console script

Prefer not to install anything? [`standalone-script/`](standalone-script/)
has a one-off script you paste into the DevTools console and run — same
underlying logic as the extensions, no install, nothing left behind.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) — free to use, modify, and share for
any noncommercial purpose, with attribution. Not licensed for commercial use.

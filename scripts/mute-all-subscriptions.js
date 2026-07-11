// YouTube: bulk-set every subscribed channel's notification preference.
//
// Usage:
//   1. Go to https://www.youtube.com/feed/channels and let the page load.
//   2. Open DevTools console (F12) and paste this whole file, then press Enter.
//   3. Watch the console log as it works through each channel. It scrolls
//      down automatically to pick up channels that load lazily.
//
// This does NOT make raw HTTP requests. It drives the real page UI (clicks
// the bell button, then clicks the target option in the dropdown) so
// YouTube's own frontend code sends the request with correct auth. This is
// slower than a raw API call but doesn't require touching session
// cookies/tokens.
//
// Safe to re-run: reselecting a channel's current preference is a no-op.
//
// Before running for real, set DRY_RUN to true and (optionally) LIMIT to a
// small number to verify it finds the right channels/menu items without
// changing anything - it opens each menu, confirms it can find the target
// option, logs it, then closes the menu without clicking.

(async () => {
  const TARGET_PREFERENCE = 'None'; // one of: 'All', 'Personalised', 'None'
  const DRY_RUN = true; // set to false to actually apply TARGET_PREFERENCE
  const LIMIT = 5; // process only the first N channels; set to null for all
  const DEBUG = false; // set to true to see YouTube's own noisy-but-harmless console errors too
  const DELAY_MIN_MS = 500;
  const DELAY_MAX_MS = 900;
  const MENU_TIMEOUT_MS = 4000;
  const MAX_IDLE_SCROLLS = 3; // stop after this many scrolls find no new channels

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = () => sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
  const isVisible = (el) => !!el && el.offsetParent !== null;

  // A plain el.click() lacks real pointer coordinates, which trips up
  // YouTube's own ripple/touch-feedback animation code (harmless but noisy
  // console errors). Dispatching a fuller pointer/mouse event sequence with
  // coordinates at the element's center avoids that.
  const simulateClick = (el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  };

  const closeAnyOpenMenu = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
  };

  // YouTube's own ripple/touch-feedback code throws a harmless, uncaught
  // "classList, e is null" TypeError in its ui.js in response to our
  // synthetic clicks. It doesn't affect functionality, but it's noisy -
  // suppress just this known signature from the console while we run.
  const isKnownYtRippleNoise = (event) =>
    typeof event.message === 'string' &&
    event.message.includes('classList') &&
    typeof event.filename === 'string' &&
    event.filename.includes('ui.js');

  const suppressYtRippleNoise = (event) => {
    if (isKnownYtRippleNoise(event)) event.preventDefault();
  };

  const waitFor = async (fn, timeoutMs = MENU_TIMEOUT_MS, intervalMs = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = fn();
      if (result) return result;
      await sleep(intervalMs);
    }
    return null;
  };

  const getChannelName = (row) =>
    row.querySelector('#channel-title #text')?.textContent?.trim() || '(unknown channel)';

  const findOpenMenuItem = (title) => {
    const items = Array.from(document.querySelectorAll('ytd-menu-popup-renderer ytd-menu-service-item-renderer'));
    return items.find((item) => {
      if (!isVisible(item)) return false;
      return item.querySelector('.title')?.textContent?.trim() === title;
    });
  };

  const setChannelPreference = async (row) => {
    const name = getChannelName(row);
    const bellBtn = row.querySelector('ytd-subscription-notification-toggle-button-renderer-next button');

    if (!bellBtn) {
      console.warn(`[skip] no notification button found for "${name}" (maybe not subscribed via bell?)`);
      return 'skip';
    }

    simulateClick(bellBtn);
    await jitter();

    // Not every channel offers all four options (some only show e.g.
    // "Disabled"/"Unsubscribe") - this isn't an error, just means that
    // channel doesn't support the requested preference. Report it distinctly
    // rather than folding it into "no errors".
    const targetItem = await waitFor(() => findOpenMenuItem(TARGET_PREFERENCE));
    if (!targetItem) {
      console.warn(`[unavailable] "${TARGET_PREFERENCE}" option not offered for "${name}" - closing menu and skipping`);
      closeAnyOpenMenu();
      await jitter();
      return 'unavailable';
    }

    // The currently-active option carries a bare is-selected attribute on the
    // ytd-menu-service-item-renderer itself. aria-selected/the iron-selected
    // class are NOT reliable for this - they reflect a roving-tabindex
    // keyboard-focus default that always lands on the first item ("All")
    // regardless of the real preference. If it's already the target, close
    // without clicking so we never fire a redundant request.
    if (targetItem.hasAttribute('is-selected')) {
      console.log(`[skip] "${name}" already set to "${TARGET_PREFERENCE}"`);
      closeAnyOpenMenu();
      await jitter();
      return 'skip';
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would set "${name}" to "${TARGET_PREFERENCE}" (option found OK)`);
      closeAnyOpenMenu();
      await jitter();
      return 'dry-run';
    }

    const clickTarget = targetItem.querySelector('tp-yt-paper-item') || targetItem;
    simulateClick(clickTarget);
    console.log(`[set] "${name}" -> "${TARGET_PREFERENCE}"`);
    await jitter();
    return 'set';
  };

  if (!['All', 'Personalised', 'None'].includes(TARGET_PREFERENCE)) {
    console.error(`Invalid TARGET_PREFERENCE "${TARGET_PREFERENCE}" - must be one of 'All', 'Personalised', 'None'.`);
    return;
  }

  if (DRY_RUN) {
    console.log(`Running in DRY_RUN mode - no settings will be changed. Set DRY_RUN = false to apply for real.`);
  }

  if (!DEBUG) window.addEventListener('error', suppressYtRippleNoise);
  try {
    const processed = new Set();
    let idleScrolls = 0;
    let failed = 0;
    const unavailable = [];

    while (idleScrolls < MAX_IDLE_SCROLLS) {
      if (LIMIT !== null && processed.size >= LIMIT) break;

      let rows = Array.from(document.querySelectorAll('ytd-channel-renderer')).filter((row) => !processed.has(row));
      if (LIMIT !== null) rows = rows.slice(0, LIMIT - processed.size);

      if (rows.length === 0) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await sleep(1500);
        idleScrolls++;
        continue;
      }
      idleScrolls = 0;

      for (const row of rows) {
        processed.add(row);
        const name = getChannelName(row);
        try {
          const outcome = await setChannelPreference(row);
          if (outcome === 'unavailable') unavailable.push(name);
        } catch (err) {
          failed++;
          console.error(`[error] ${name}:`, err);
        }
      }

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(1200);
    }

    console.log(
      `Done. Processed ${processed.size} channel(s): ${failed} error(s), ${unavailable.length} missing the "${TARGET_PREFERENCE}" option.${
        DRY_RUN ? ' (DRY_RUN - nothing was changed)' : ''
      }`
    );
    if (unavailable.length > 0) {
      console.log(`Channels that don't offer "${TARGET_PREFERENCE}" (check them manually):`);
      for (const name of unavailable) console.log(`  - ${name}`);
    }
  } finally {
    if (!DEBUG) window.removeEventListener('error', suppressYtRippleNoise);
  }
})();

// YouTube: set every subscribed channel's notification preference to "None".
//
// Usage:
//   1. Go to https://www.youtube.com/feed/channels and let the page load.
//   2. Open DevTools console (F12) and paste this whole file, then press Enter.
//   3. Watch the console log as it works through each channel. It scrolls
//      down automatically to pick up channels that load lazily.
//
// This does NOT make raw HTTP requests. It drives the real page UI (clicks
// the bell button, then clicks "None" in the dropdown) so YouTube's own
// frontend code sends the request with correct auth. This is slower than a
// raw API call but doesn't require touching session cookies/tokens.
//
// Safe to re-run: clicking "None" on an already-muted channel is a no-op.
//
// Before running for real, set DRY_RUN to true and (optionally) LIMIT to a
// small number to verify it finds the right channels/menu items without
// changing anything - it opens each menu, confirms it can find "None", logs
// it, then closes the menu without clicking.

(async () => {
  const DRY_RUN = true; // set to false to actually apply the "None" setting
  const LIMIT = 5; // process only the first N channels; set to null for all
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

  const findOpenNoneMenuItem = () => {
    const items = Array.from(document.querySelectorAll('ytd-menu-popup-renderer ytd-menu-service-item-renderer'));
    return items.find((item) => {
      if (!isVisible(item)) return false;
      const title = item.querySelector('.title')?.textContent?.trim();
      return title === 'None';
    });
  };

  const muteChannel = async (row) => {
    const name = getChannelName(row);
    const bellBtn = row.querySelector('ytd-subscription-notification-toggle-button-renderer-next button');

    if (!bellBtn) {
      console.warn(`[skip] no notification button found for "${name}" (maybe not subscribed via bell?)`);
      return;
    }

    simulateClick(bellBtn);
    await jitter();

    const noneItem = await waitFor(findOpenNoneMenuItem);
    if (!noneItem) {
      console.warn(`[fail] "None" option not found for "${name}" - closing menu and skipping`);
      closeAnyOpenMenu();
      await jitter();
      return;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would mute "${name}" (found "None" option OK)`);
      closeAnyOpenMenu();
      await jitter();
      return;
    }

    const clickTarget = noneItem.querySelector('tp-yt-paper-item') || noneItem;
    simulateClick(clickTarget);
    console.log(`[muted] ${name}`);
    await jitter();
  };

  if (DRY_RUN) {
    console.log(`Running in DRY_RUN mode - no settings will be changed. Set DRY_RUN = false to apply for real.`);
  }

  const processed = new Set();
  let idleScrolls = 0;
  let muted = 0;
  let failed = 0;

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
      try {
        await muteChannel(row);
        muted++;
      } catch (err) {
        failed++;
        console.error(`[error] ${getChannelName(row)}:`, err);
      }
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(1200);
  }

  console.log(`Done. Processed ${processed.size} channel(s), ${failed} error(s).${DRY_RUN ? ' (DRY_RUN - nothing was changed)' : ''}`);
})();
